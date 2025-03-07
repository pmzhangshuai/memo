package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/usememos/memos/store"
)

func (d *DB) IsFollowingUser(ctx context.Context, follow *store.UserFollowing) (bool, error) {
	// 编写 SQL 查询语句
	stmt := `
SELECT COUNT(*) FROM user_following
WHERE user_id = ? AND following_user_id = ?
`
	// 准备参数
	args := []interface{}{follow.UserID, follow.FollowingUserID}

	// 执行查询操作
	var count int
	err := d.db.QueryRowContext(ctx, stmt, args...).Scan(&count)
	if err != nil {
		if err == sql.ErrNoRows {
			// 如果没有找到记录，这不是一个错误，只是表示未关注
			return false, nil
		}
		return false, err // 其他错误，返回错误
	}

	// 根据查询结果判断是否已关注
	return count > 0, nil
}

func (d *DB) FollowUser(ctx context.Context, follow *store.UserFollowing) error {
	// 编写 SQL 插入语句
	stmt := `
    INSERT INTO user_following (user_id, following_user_id, created_ts)
    VALUES (?, ?, strftime('%s', 'now'))
    `

	// 准备参数
	args := []interface{}{follow.UserID, follow.FollowingUserID}

	// 执行插入操作
	_, err := d.db.ExecContext(ctx, stmt, args...)
	if err != nil {
		// 检查是否是唯一约束冲突错误（即重复关注）
		// if sqliteErr, ok := err.(*sqlite.Error); ok && sqliteErr.Code == sqlite.ErrConstraintUnique {
		// 	return store.ErrAlreadyFollowing // 假设你有一个自定义错误表示已关注
		// }
		return err // 其他错误，直接返回
	}

	return nil // 插入成功，返回 nil
}

func (d *DB) UnFollowUser(ctx context.Context, UnFollow *store.UserFollowing) error {
	stmt := `
DELETE FROM user_following WHERE user_id = ? AND following_user_id = ?
`
	// 准备参数
	args := []interface{}{UnFollow.UserID, UnFollow.FollowingUserID}

	// 执行删除操作
	result, err := d.db.ExecContext(ctx, stmt, args...)
	if err != nil {
		return err
	}
	if _, err := result.RowsAffected(); err != nil {
		return err
	}
	return nil
}

// GetFollowingList returns a list of users that the given user is following.
func (d *DB) GetFollowingList(ctx context.Context, userID int32) ([]*store.User, error) {
	// Query user_following table to get all following_user_ids for the given user_id
	followingQuery := `
    SELECT following_user_id 
    FROM user_following 
    WHERE user_id = ?`

	rows, err := d.db.QueryContext(ctx, followingQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user_following: %w", err)
	}
	defer rows.Close()

	followingUserIDs := make([]*int, 0)
	for rows.Next() {
		var followingUserID int
		if err := rows.Scan(&followingUserID); err != nil {
			return nil, fmt.Errorf("failed to scan user_following row: %w", err)
		}
		followingUserIDs = append(followingUserIDs, &followingUserID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user_following rows: %w", err)
	}

	// If there are no following users, return an empty list
	if len(followingUserIDs) == 0 {
		return []*store.User{}, nil
	}

	// Create a placeholder string for the IN clause
	placeholders := "(?" + strings.Repeat(",?", len(followingUserIDs)-1) + ")"

	// Create a slice of interface{} to hold the followingUserIDs
	followingUserIDsInterfaces := make([]interface{}, len(followingUserIDs))
	for i, id := range followingUserIDs {
		followingUserIDsInterfaces[i] = id
	}

	// Query user table to get details of the following users
	userQuery := fmt.Sprintf(`
    SELECT id, username, role, email, nickname, avatar_url, description, created_ts, updated_ts, row_status 
    FROM user 
    WHERE id IN %s`, placeholders)

	// Pass the slice of interface{} to d.db.Query
	// 可以在查询中利用上下文来控制超时、取消等操作
	rows, err = d.db.QueryContext(ctx, userQuery, followingUserIDsInterfaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to query user table: %w", err)
	}
	defer rows.Close()

	users := make([]*store.User, 0)
	for rows.Next() {
		var user store.User
		if err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Role,
			&user.Email,
			&user.Nickname,
			&user.AvatarURL,
			&user.Description,
			&user.CreatedTs,
			&user.UpdatedTs,
			&user.RowStatus,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, &user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user rows: %w", err)
	}

	return users, nil
}
func (d *DB) GetFollowerList(ctx context.Context, userID int32) ([]*store.User, error) {
	// Query user_following table to get all user_ids that are following the given user_id
	followerQuery := `
SELECT user_id 
FROM user_following 
WHERE following_user_id = ?`

	rows, err := d.db.QueryContext(ctx, followerQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user_following: %w", err)
	}
	defer rows.Close()

	followerUserIDs := make([]*int, 0)
	for rows.Next() {
		var followerUserID int
		if err := rows.Scan(&followerUserID); err != nil {
			return nil, fmt.Errorf("failed to scan user_following row: %w", err)
		}
		followerUserIDs = append(followerUserIDs, &followerUserID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user_following rows: %w", err)
	}

	// If there are no followers, return an empty list
	if len(followerUserIDs) == 0 {
		return []*store.User{}, nil
	}

	// Create a placeholder string for the IN clause
	placeholders := "(?" + strings.Repeat(",?", len(followerUserIDs)-1) + ")"

	// Create a slice of interface{} to hold the followerUserIDs
	followerUserIDsInterfaces := make([]interface{}, len(followerUserIDs))
	for i, id := range followerUserIDs {
		followerUserIDsInterfaces[i] = id
	}

	// Query user table to get details of the followers
	userQuery := fmt.Sprintf(`
SELECT id, username, role, email, nickname, avatar_url, description, created_ts, updated_ts, row_status 
FROM user 
WHERE id IN %s`, placeholders)

	// Pass the slice of interface{} to d.db.Query
	rows, err = d.db.QueryContext(ctx, userQuery, followerUserIDsInterfaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to query user table: %w", err)
	}
	defer rows.Close()

	users := make([]*store.User, 0)
	for rows.Next() {
		var user store.User
		if err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Role,
			&user.Email,
			&user.Nickname,
			&user.AvatarURL,
			&user.Description,
			&user.CreatedTs,
			&user.UpdatedTs,
			&user.RowStatus,
		); err != nil {
			return nil, fmt.Errorf("failed to scan user row: %w", err)
		}
		users = append(users, &user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user rows: %w", err)
	}

	return users, nil
}
