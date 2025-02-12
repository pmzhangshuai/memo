package sqlite

import (
	"context"
	"database/sql"

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
	result, err := d.db.ExecContext(ctx, `
		DELETE FROM user_following WHERE id = ?
	`, UnFollow.ID)
	if err != nil {
		return err
	}
	if _, err := result.RowsAffected(); err != nil {
		return err
	}
	return nil
}
