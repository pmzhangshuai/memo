package v1

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/genproto/googleapis/api/httpbody"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/usememos/memos/internal/util"
	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

func (s *APIV1Service) ListUsers(ctx context.Context, _ *v1pb.ListUsersRequest) (*v1pb.ListUsersResponse, error) {
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if currentUser.Role != store.RoleHost && currentUser.Role != store.RoleAdmin {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	users, err := s.Store.ListUsers(ctx, &store.FindUser{})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list users: %v", err)
	}

	response := &v1pb.ListUsersResponse{
		Users: []*v1pb.User{},
	}
	for _, user := range users {
		response.Users = append(response.Users, convertUserFromStore(user))
	}
	return response, nil
}

func (s *APIV1Service) GetUser(ctx context.Context, request *v1pb.GetUserRequest) (*v1pb.User, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	user, err := s.Store.GetUser(ctx, &store.FindUser{
		ID: &userID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return convertUserFromStore(user), nil
}

func (s *APIV1Service) GetUserByUsername(ctx context.Context, request *v1pb.GetUserByUsernameRequest) (*v1pb.User, error) {
	user, err := s.Store.GetUser(ctx, &store.FindUser{
		Username: &request.Username,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	return convertUserFromStore(user), nil
}

func (s *APIV1Service) GetUserAvatarBinary(ctx context.Context, request *v1pb.GetUserAvatarBinaryRequest) (*httpbody.HttpBody, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	user, err := s.Store.GetUser(ctx, &store.FindUser{
		ID: &userID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}
	if user.AvatarURL == "" {
		return nil, status.Errorf(codes.NotFound, "avatar not found")
	}

	imageType, base64Data, err := extractImageInfo(user.AvatarURL)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to extract image info: %v", err)
	}
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to decode string: %v", err)
	}
	httpBody := &httpbody.HttpBody{
		ContentType: imageType,
		Data:        imageData,
	}
	return httpBody, nil
}

func (s *APIV1Service) CreateUser(ctx context.Context, request *v1pb.CreateUserRequest) (*v1pb.User, error) {
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if currentUser.Role != store.RoleHost {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}
	if !util.UIDMatcher.MatchString(strings.ToLower(request.User.Username)) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid username: %s", request.User.Username)
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(request.User.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "failed to generate password hash").SetInternal(err)
	}

	user, err := s.Store.CreateUser(ctx, &store.User{
		Username:     request.User.Username,
		Role:         convertUserRoleToStore(request.User.Role),
		Email:        request.User.Email,
		Nickname:     request.User.Nickname,
		PasswordHash: string(passwordHash),
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create user: %v", err)
	}

	return convertUserFromStore(user), nil
}

func (s *APIV1Service) UpdateUser(ctx context.Context, request *v1pb.UpdateUserRequest) (*v1pb.User, error) {
	workspaceGeneralSetting, err := s.Store.GetWorkspaceGeneralSetting(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get workspace general setting: %v", err)
	}

	userID, err := ExtractUserIDFromName(request.User.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if currentUser.ID != userID && currentUser.Role != store.RoleAdmin && currentUser.Role != store.RoleHost {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}
	if request.UpdateMask == nil || len(request.UpdateMask.Paths) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "update mask is empty")
	}

	user, err := s.Store.GetUser(ctx, &store.FindUser{ID: &userID})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	currentTs := time.Now().Unix()
	update := &store.UpdateUser{
		ID:        user.ID,
		UpdatedTs: &currentTs,
	}
	for _, field := range request.UpdateMask.Paths {
		if field == "username" {
			if workspaceGeneralSetting.DisallowChangeUsername {
				return nil, status.Errorf(codes.PermissionDenied, "permission denied: disallow change username")
			}
			if !util.UIDMatcher.MatchString(strings.ToLower(request.User.Username)) {
				return nil, status.Errorf(codes.InvalidArgument, "invalid username: %s", request.User.Username)
			}
			update.Username = &request.User.Username
		} else if field == "nickname" {
			if workspaceGeneralSetting.DisallowChangeNickname {
				return nil, status.Errorf(codes.PermissionDenied, "permission denied: disallow change nickname")
			}
			update.Nickname = &request.User.Nickname
		} else if field == "email" {
			update.Email = &request.User.Email
		} else if field == "avatar_url" {
			update.AvatarURL = &request.User.AvatarUrl
		} else if field == "description" {
			update.Description = &request.User.Description
		} else if field == "gender" {
			update.Gender = &request.User.Gender
		} else if field == "birth_date" {
			if request.User.BirthDate != nil {
				tempTime := (*request.User.BirthDate).AsTime()
				update.BirthDate = &tempTime
			}
		} else if field == "location" {
			update.Location = &request.User.Location
		} else if field == "industry" {
			update.Industry = &request.User.Industry
		} else if field == "occupation" {
			update.Occupation = &request.User.Occupation
		} else if field == "university" {
			update.University = &request.User.University
		} else if field == "role" {
			role := convertUserRoleToStore(request.User.Role)
			update.Role = &role
		} else if field == "password" {
			passwordHash, err := bcrypt.GenerateFromPassword([]byte(request.User.Password), bcrypt.DefaultCost)
			if err != nil {
				return nil, echo.NewHTTPError(http.StatusInternalServerError, "failed to generate password hash").SetInternal(err)
			}
			passwordHashStr := string(passwordHash)
			update.PasswordHash = &passwordHashStr
		} else if field == "state" {
			rowStatus := convertStateToStore(request.User.State)
			update.RowStatus = &rowStatus
		} else {
			return nil, status.Errorf(codes.InvalidArgument, "invalid update path: %s", field)
		}
	}

	updatedUser, err := s.Store.UpdateUser(ctx, update)
	if err != nil {
		// log.Printf("update user: %s", *update.Gender)
		return nil, status.Errorf(codes.Internal, "failed to update user: %v", err)
	}

	return convertUserFromStore(updatedUser), nil
}

func (s *APIV1Service) DeleteUser(ctx context.Context, request *v1pb.DeleteUserRequest) (*emptypb.Empty, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if currentUser.ID != userID && currentUser.Role != store.RoleAdmin && currentUser.Role != store.RoleHost {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	user, err := s.Store.GetUser(ctx, &store.FindUser{ID: &userID})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}

	if err := s.Store.DeleteUser(ctx, &store.DeleteUser{
		ID: user.ID,
	}); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete user: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *APIV1Service) IsFollowingUser(ctx context.Context, request *v1pb.IsFollowingUserRequest) (*v1pb.IsFollowingUserResponse, error) {
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}

	// currentUserID, err := ExtractUserIDFromName(request.Follow.UserName)
	currentUserID := currentUser.ID
	// targetUserID, err := ExtractUserIDFromName(request.Follow.FollowingUserName)
	// if err != nil {
	// 	return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	// }
	targetUsername := request.Follow.FollowingUserName
	user, err := s.Store.GetUser(ctx, &store.FindUser{Username: &targetUsername})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get target user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "target user not found")
	}

	result, err := s.Store.IsFollowingUser(ctx, &store.UserFollowing{
		UserID:          currentUserID,
		FollowingUserID: user.ID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to check following status: %v", err)
	}

	// 构造响应消息
	response := &v1pb.IsFollowingUserResponse{
		Result: result,
	}

	return response, nil
}

func (s *APIV1Service) FollowUser(ctx context.Context, request *v1pb.FollowUserRequest) (*v1pb.UserFollowing, error) {
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}

	// currentUserID, err := ExtractUserIDFromName(request.Follow.UserName)
	currentUserID := currentUser.ID
	targetUsername := request.Follow.FollowingUserName
	user, err := s.Store.GetUser(ctx, &store.FindUser{Username: &targetUsername})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get target user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "target user not found")
	}

	result, err := s.Store.IsFollowingUser(ctx, &store.UserFollowing{
		UserID:          currentUserID,
		FollowingUserID: user.ID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to check following status: %v", err)
	}

	if result {
		err := s.Store.UnFollowUser(ctx, &store.UserFollowing{
			UserID:          currentUserID,
			FollowingUserID: user.ID,
		})
		if err != nil {
			return nil, status.Errorf(codes.Internal, "failed to unfollow user: %v", err)
		}
	} else {
		err := s.Store.FollowUser(ctx, &store.UserFollowing{
			UserID:          currentUserID,
			FollowingUserID: user.ID,
		})
		if err != nil {
			return nil, status.Errorf(codes.Internal, "failed to follow user: %v", err)
		}
	}

	return &v1pb.UserFollowing{
		UserName:          request.Follow.UserName,
		FollowingUserName: request.Follow.FollowingUserName,
	}, nil
}

func (s *APIV1Service) GetFollowingList(ctx context.Context, request *v1pb.GetFollowingListRequest) (*v1pb.ListUsersResponse, error) {
	// user, err := s.GetCurrentUser(ctx)
	// if err != nil {
	// 	return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	// }
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}

	followingList, err := s.Store.GetFollowingList(ctx, userID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get following list: %v", err)
	}
	if followingList == nil {
		return nil, status.Errorf(codes.NotFound, "following list not found")
	}

	response2 := &v1pb.ListUsersResponse{
		Users: []*v1pb.User{},
	}
	response := &v1pb.FollowingListResponse{
		Users: []*v1pb.User{},
	}
	for _, user := range followingList {
		// log.Printf("Original Following user: %s", user)
		convertedUser := convertUserFromStore(user)
		// log.Printf("Converted Following user: %s", convertedUser)
		response2.Users = append(response2.Users, convertedUser)
		response.Users = append(response.Users, convertedUser)
	}

	// for i, user := range followingList {
	// 	log.Printf("Original Following user %d: %+v", i, user)
	// }
	// // 使用转换函数
	// convertedUsers := convertUsersFromStore(followingList)
	// for i, user := range convertedUsers {
	// 	log.Printf("Converted Following user %d: %+v", i, user)
	// }
	// log.Printf("Converted followingList: %s", convertedUsers)
	// response := &v1pb.FollowingListResponse{
	// 	Users: convertedUsers,
	// }
	// log.Printf("Original response2: %s", response2)
	// log.Printf("Original response: %s", response)

	return response2, nil
}

func (s *APIV1Service) GetFollowerList(ctx context.Context, request *v1pb.GetFollowerListRequest) (*v1pb.FollowerListResponse, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	followerList, err := s.Store.GetFollowerList(ctx, userID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get follower list: %v", err)
	}
	if followerList == nil {
		return nil, status.Errorf(codes.NotFound, "follower list not found")
	}
	response := &v1pb.FollowerListResponse{
		Users: []*v1pb.User{},
	}
	for _, user := range followerList {
		convertedUser := convertUserFromStore(user)
		response.Users = append(response.Users, convertedUser)
	}
	return response, nil
}

func getDefaultUserSetting() *v1pb.UserSetting {
	return &v1pb.UserSetting{
		Locale:         "zh-Hans",
		Appearance:     "system",
		MemoVisibility: "PUBLIC",
	}
}

func (s *APIV1Service) GetUserSetting(ctx context.Context, _ *v1pb.GetUserSettingRequest) (*v1pb.UserSetting, error) {
	user, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}

	userSettings, err := s.Store.ListUserSettings(ctx, &store.FindUserSetting{
		UserID: &user.ID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list user settings: %v", err)
	}
	userSettingMessage := getDefaultUserSetting()
	for _, setting := range userSettings {
		if setting.Key == storepb.UserSettingKey_LOCALE {
			userSettingMessage.Locale = setting.GetLocale()
		} else if setting.Key == storepb.UserSettingKey_APPEARANCE {
			userSettingMessage.Appearance = setting.GetAppearance()
		} else if setting.Key == storepb.UserSettingKey_MEMO_VISIBILITY {
			userSettingMessage.MemoVisibility = setting.GetMemoVisibility()
		}
	}
	return userSettingMessage, nil
}

func (s *APIV1Service) UpdateUserSetting(ctx context.Context, request *v1pb.UpdateUserSettingRequest) (*v1pb.UserSetting, error) {
	user, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}

	if request.UpdateMask == nil || len(request.UpdateMask.Paths) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "update mask is empty")
	}

	for _, field := range request.UpdateMask.Paths {
		if field == "locale" {
			if _, err := s.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
				UserId: user.ID,
				Key:    storepb.UserSettingKey_LOCALE,
				Value: &storepb.UserSetting_Locale{
					Locale: request.Setting.Locale,
				},
			}); err != nil {
				return nil, status.Errorf(codes.Internal, "failed to upsert user setting: %v", err)
			}
		} else if field == "appearance" {
			if _, err := s.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
				UserId: user.ID,
				Key:    storepb.UserSettingKey_APPEARANCE,
				Value: &storepb.UserSetting_Appearance{
					Appearance: request.Setting.Appearance,
				},
			}); err != nil {
				return nil, status.Errorf(codes.Internal, "failed to upsert user setting: %v", err)
			}
		} else if field == "memo_visibility" {
			if _, err := s.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
				UserId: user.ID,
				Key:    storepb.UserSettingKey_MEMO_VISIBILITY,
				Value: &storepb.UserSetting_MemoVisibility{
					MemoVisibility: request.Setting.MemoVisibility,
				},
			}); err != nil {
				return nil, status.Errorf(codes.Internal, "failed to upsert user setting: %v", err)
			}
		} else {
			return nil, status.Errorf(codes.InvalidArgument, "invalid update path: %s", field)
		}
	}

	return s.GetUserSetting(ctx, &v1pb.GetUserSettingRequest{})
}

func (s *APIV1Service) ListUserAccessTokens(ctx context.Context, request *v1pb.ListUserAccessTokensRequest) (*v1pb.ListUserAccessTokensResponse, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}

	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}
	if currentUser.ID != userID {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	userAccessTokens, err := s.Store.GetUserAccessTokens(ctx, userID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list access tokens: %v", err)
	}

	accessTokens := []*v1pb.UserAccessToken{}
	for _, userAccessToken := range userAccessTokens {
		claims := &ClaimsMessage{}
		_, err := jwt.ParseWithClaims(userAccessToken.AccessToken, claims, func(t *jwt.Token) (any, error) {
			if t.Method.Alg() != jwt.SigningMethodHS256.Name {
				return nil, errors.Errorf("unexpected access token signing method=%v, expect %v", t.Header["alg"], jwt.SigningMethodHS256)
			}
			if kid, ok := t.Header["kid"].(string); ok {
				if kid == "v1" {
					return []byte(s.Secret), nil
				}
			}
			return nil, errors.Errorf("unexpected access token kid=%v", t.Header["kid"])
		})
		if err != nil {
			// If the access token is invalid or expired, just ignore it.
			continue
		}

		userAccessToken := &v1pb.UserAccessToken{
			AccessToken: userAccessToken.AccessToken,
			Description: userAccessToken.Description,
			IssuedAt:    timestamppb.New(claims.IssuedAt.Time),
		}
		if claims.ExpiresAt != nil {
			userAccessToken.ExpiresAt = timestamppb.New(claims.ExpiresAt.Time)
		}
		accessTokens = append(accessTokens, userAccessToken)
	}

	// Sort by issued time in descending order.
	slices.SortFunc(accessTokens, func(i, j *v1pb.UserAccessToken) int {
		return int(i.IssuedAt.Seconds - j.IssuedAt.Seconds)
	})
	response := &v1pb.ListUserAccessTokensResponse{
		AccessTokens: accessTokens,
	}
	return response, nil
}

func (s *APIV1Service) CreateUserAccessToken(ctx context.Context, request *v1pb.CreateUserAccessTokenRequest) (*v1pb.UserAccessToken, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}
	if currentUser.ID != userID {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	expiresAt := time.Time{}
	if request.ExpiresAt != nil {
		expiresAt = request.ExpiresAt.AsTime()
	}

	accessToken, err := GenerateAccessToken(currentUser.Username, currentUser.ID, expiresAt, []byte(s.Secret))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate access token: %v", err)
	}

	claims := &ClaimsMessage{}
	_, err = jwt.ParseWithClaims(accessToken, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Name {
			return nil, errors.Errorf("unexpected access token signing method=%v, expect %v", t.Header["alg"], jwt.SigningMethodHS256)
		}
		if kid, ok := t.Header["kid"].(string); ok {
			if kid == "v1" {
				return []byte(s.Secret), nil
			}
		}
		return nil, errors.Errorf("unexpected access token kid=%v", t.Header["kid"])
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to parse access token: %v", err)
	}

	// Upsert the access token to user setting store.
	if err := s.UpsertAccessTokenToStore(ctx, currentUser, accessToken, request.Description); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to upsert access token to store: %v", err)
	}

	userAccessToken := &v1pb.UserAccessToken{
		AccessToken: accessToken,
		Description: request.Description,
		IssuedAt:    timestamppb.New(claims.IssuedAt.Time),
	}
	if claims.ExpiresAt != nil {
		userAccessToken.ExpiresAt = timestamppb.New(claims.ExpiresAt.Time)
	}
	return userAccessToken, nil
}

func (s *APIV1Service) DeleteUserAccessToken(ctx context.Context, request *v1pb.DeleteUserAccessTokenRequest) (*emptypb.Empty, error) {
	userID, err := ExtractUserIDFromName(request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid user name: %v", err)
	}
	currentUser, err := s.GetCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}
	if currentUser.ID != userID {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	userAccessTokens, err := s.Store.GetUserAccessTokens(ctx, currentUser.ID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list access tokens: %v", err)
	}
	updatedUserAccessTokens := []*storepb.AccessTokensUserSetting_AccessToken{}
	for _, userAccessToken := range userAccessTokens {
		if userAccessToken.AccessToken == request.AccessToken {
			continue
		}
		updatedUserAccessTokens = append(updatedUserAccessTokens, userAccessToken)
	}
	if _, err := s.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
		UserId: currentUser.ID,
		Key:    storepb.UserSettingKey_ACCESS_TOKENS,
		Value: &storepb.UserSetting_AccessTokens{
			AccessTokens: &storepb.AccessTokensUserSetting{
				AccessTokens: updatedUserAccessTokens,
			},
		},
	}); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to upsert user setting: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *APIV1Service) UpsertAccessTokenToStore(ctx context.Context, user *store.User, accessToken, description string) error {
	userAccessTokens, err := s.Store.GetUserAccessTokens(ctx, user.ID)
	if err != nil {
		return errors.Wrap(err, "failed to get user access tokens")
	}
	userAccessToken := storepb.AccessTokensUserSetting_AccessToken{
		AccessToken: accessToken,
		Description: description,
	}
	userAccessTokens = append(userAccessTokens, &userAccessToken)
	if _, err := s.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
		UserId: user.ID,
		Key:    storepb.UserSettingKey_ACCESS_TOKENS,
		Value: &storepb.UserSetting_AccessTokens{
			AccessTokens: &storepb.AccessTokensUserSetting{
				AccessTokens: userAccessTokens,
			},
		},
	}); err != nil {
		return errors.Wrap(err, "failed to upsert user setting")
	}
	return nil
}

func convertUserFromStore(user *store.User) *v1pb.User {
	// 记录原始用户名和昵称
	// log.Printf("Original name: %s", fmt.Sprintf("%s%d", UserNamePrefix, user.ID))
	// log.Printf("Original Username: %s", user.Username)
	// log.Printf("Original Nickname: %s", user.Nickname)
	// log.Printf("Original Description: %s", user.Description)
	// log.Printf("Original Email: %s", user.Email)
	// log.Printf("Original AvatarUrl: %s", user.AvatarURL)
	userid := validateAndConvertToUTF8(fmt.Sprintf("%s%d", UserNamePrefix, user.ID))
	// 验证并转换用户名
	username := validateAndConvertToUTF8(user.Username)
	// 验证并转换昵称
	nickname := validateAndConvertToUTF8(user.Nickname)
	avatarURL := validateAndConvertToUTF8(user.AvatarURL)
	description := validateAndConvertToUTF8(user.Description)
	gender := validateAndConvertToUTF8(user.Gender)
	location := validateAndConvertToUTF8(user.Location)
	industry := validateAndConvertToUTF8(user.Industry)
	occupation := validateAndConvertToUTF8(user.Occupation)
	university := validateAndConvertToUTF8(user.University)
	email := validateAndConvertToUTF8(user.Email)
	// 记录转换后的用户名和昵称
	// log.Printf("Converted name: %s", userid)
	// log.Printf("Converted Username: %s", username)
	// log.Printf("Converted Nickname: %s", nickname)
	// log.Printf("Converted Description: %s", description)
	// log.Printf("Converted Email: %s", email)
	// log.Printf("Converted AvatarUrl: %s", avatarURL)
	userpb := &v1pb.User{
		Name:        userid,
		State:       convertStateFromStore(user.RowStatus),
		CreateTime:  timestamppb.New(time.Unix(user.CreatedTs, 0)),
		UpdateTime:  timestamppb.New(time.Unix(user.UpdatedTs, 0)),
		Role:        convertUserRoleFromStore(user.Role),
		Username:    username,
		Email:       email,
		Nickname:    nickname,
		AvatarUrl:   avatarURL,
		Description: description,
		Gender:      gender,
		BirthDate:   timestamppb.New(user.BirthDate),
		Location:    location,
		Industry:    industry,
		Occupation:  occupation,
		University:  university,
	}
	// Use the avatar URL instead of raw base64 image data to reduce the response size.
	if user.AvatarURL != "" {
		userpb.AvatarUrl = fmt.Sprintf("/file/%s/avatar", userpb.Name)
		// log.Printf("Original AvatarUrl: %s", userpb.AvatarUrl)
		// avatarURL2 := validateAndConvertToUTF8(userpb.AvatarUrl)
		// log.Printf("Converted AvatarUrl: %s", avatarURL2)
	}
	return userpb
}

// 验证并转换字符串为 UTF-8 编码
func validateAndConvertToUTF8(input string) string {
	// 如果字符串已经是有效的 UTF-8，则直接返回
	if utf8.ValidString(input) {
		return input
	}

	// 如果不是有效的 UTF-8，则进行转换（这里使用简单的替换策略作为示例）
	var builder strings.Builder
	for _, r := range input {
		if r == utf8.RuneError {
			// 替换无效的 UTF-8 字符为问号或其他占位符
			builder.WriteRune('?')
		} else {
			builder.WriteRune(r)
		}
	}
	return builder.String()
}

// func convertUsersFromStore(users []store.User) []*v1pb.User {
// 	userList := make([]*v1pb.User, 0, len(users))
// 	for _, user := range users {
// 		userList = append(userList, convertUserFromStore(&user))
// 	}
// 	return userList
// }

func convertUserRoleFromStore(role store.Role) v1pb.User_Role {
	switch role {
	case store.RoleHost:
		return v1pb.User_HOST
	case store.RoleAdmin:
		return v1pb.User_ADMIN
	case store.RoleUser:
		return v1pb.User_USER
	default:
		return v1pb.User_ROLE_UNSPECIFIED
	}
}

func convertUserRoleToStore(role v1pb.User_Role) store.Role {
	switch role {
	case v1pb.User_HOST:
		return store.RoleHost
	case v1pb.User_ADMIN:
		return store.RoleAdmin
	case v1pb.User_USER:
		return store.RoleUser
	default:
		return store.RoleUser
	}
}

func extractImageInfo(dataURI string) (string, string, error) {
	dataURIRegex := regexp.MustCompile(`^data:(?P<type>.+);base64,(?P<base64>.+)`)
	matches := dataURIRegex.FindStringSubmatch(dataURI)
	if len(matches) != 3 {
		return "", "", errors.New("Invalid data URI format")
	}
	imageType := matches[1]
	base64Data := matches[2]
	return imageType, base64Data, nil
}
