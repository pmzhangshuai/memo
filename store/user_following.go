package store

import (
	"context"
)

type UserFollowing struct {
	ID              int32
	UserID          int32
	FollowingUserID int32
	Tag             string
	CreatedTs       int64
}

// 查询当前用户是否已关注某个指定用户
func (s *Store) IsFollowingUser(ctx context.Context, follow *UserFollowing) (bool, error) {
	// 调用底层数据驱动的方法来检查是否存在对应的关注记录
	isFollowing, err := s.driver.IsFollowingUser(ctx, follow)
	if err != nil {
		return false, err
	}
	return isFollowing, nil
}

func (s *Store) FollowUser(ctx context.Context, follow *UserFollowing) error {
	err := s.driver.FollowUser(ctx, follow)
	if err != nil {
		return err
	}

	s.userFollowCache.Store(follow.ID, follow)
	return nil
}

func (s *Store) UnFollowUser(ctx context.Context, UnFollow *UserFollowing) error {
	err := s.driver.UnFollowUser(ctx, UnFollow)
	if err != nil {
		return err
	}

	s.userCache.Delete(UnFollow.ID)
	return nil
}
