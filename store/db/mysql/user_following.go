package mysql

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/go-sql-driver/mysql" // 确保导入 MySQL 驱动
	"github.com/usememos/memos/store"
)

// 假设 DB 结构体已经定义，并且包含一个 *sql.DB 类型的字段，例如：
// type DB struct {
//     db *sql.DB
// }

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
VALUES (?, ?, UNIX_TIMESTAMP())
`

	// 准备参数
	args := []interface{}{follow.UserID, follow.FollowingUserID}

	// 执行插入操作
	result, err := d.db.ExecContext(ctx, stmt, args...)
	if err != nil {
		// 检查是否是唯一约束冲突错误（即重复关注）
		// if mysqlErr, ok := err.(*mysql.MySQLError); ok && mysqlErr.Number == 1062 {
		// 	// 1062 是 MySQL 中唯一约束冲突的错误码
		// 	return store.ErrAlreadyFollowing // 假设你有一个自定义错误表示已关注
		// }
		return err // 其他错误，直接返回
	}

	// 检查是否真的有行被插入（可选，但有助于调试）
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("no rows affected by the insert operation")
	}

	return nil // 插入成功，返回 nil
}

func (d *DB) UnFollowUser(ctx context.Context, unFollow *store.UserFollowing) error {
	// 注意：这里的 SQL 语句应该根据实际的表结构来编写
	// 如果 user_following 表中没有 id 字段，而是使用 user_id 和 following_user_id 作为复合主键，
	// 那么删除语句应该基于这两个字段。
	stmt := `
DELETE FROM user_following WHERE user_id = ? AND following_user_id = ?
`
	// 准备参数
	args := []interface{}{unFollow.UserID, unFollow.FollowingUserID}

	// 执行删除操作
	result, err := d.db.ExecContext(ctx, stmt, args...)
	if err != nil {
		return err
	}

	// 检查是否有行被删除（可选，但有助于调试）
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		// 如果没有行被删除，可能表示原本就没有关注关系
		// 这不一定是一个错误，但可以根据业务逻辑决定是否要返回一个错误
		// return fmt.Errorf("no rows affected by the delete operation")
		// 或者选择不返回错误：
		return nil
	}

	return nil // 删除成功，返回 nil
}

// GetFollowingList returns a list of users that the given user is following.
func (d *DB) GetFollowingList(ctx context.Context, userID int32) ([]*store.User, error) {
	// Query user_following table to get all following_user_ids for the given user_id
	followingQuery := `
    SELECT following_user_id 
    FROM user_following 
    WHERE user_id = ?`

	var followingUserIDs []int32
	rows, err := d.db.QueryContext(ctx, followingQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user_following: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var followingUserID int32
		if err := rows.Scan(&followingUserID); err != nil {
			return nil, fmt.Errorf("failed to scan user_following row: %w", err)
		}
		followingUserIDs = append(followingUserIDs, followingUserID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user_following rows: %w", err)
	}

	// If there are no following users, return an empty list
	if len(followingUserIDs) == 0 {
		return []*store.User{}, nil
	}

	// Create a placeholder string for the IN clause
	placeholders := "(" + strings.TrimSuffix(strings.Repeat("?,", len(followingUserIDs)), ",") + ")"

	// Query user table to get details of the following users
	userQuery := fmt.Sprintf(`
    SELECT id, username, role, email, nickname, avatar_url, description, created_ts, updated_ts, row_status 
    FROM user 
    WHERE id IN %s`, placeholders)

	// Prepare the statement with the userQuery (optional but recommended for performance and security)
	stmt, err := d.db.PrepareContext(ctx, userQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare user query: %w", err)
	}
	defer stmt.Close()

	// Create a slice of interface{} to hold the followingUserIDs
	followingUserIDsInterfaces := make([]interface{}, len(followingUserIDs))
	for i, id := range followingUserIDs {
		followingUserIDsInterfaces[i] = id
	}

	// Execute the statement with the followingUserIDs
	rows, err = stmt.QueryContext(ctx, followingUserIDsInterfaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute user query: %w", err)
	}
	defer rows.Close()

	var users []*store.User
	for rows.Next() {
		user := &store.User{} // 使用取地址操作符分配内存
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
		users = append(users, user)
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

	var followerUserIDs []int32
	rows, err := d.db.QueryContext(ctx, followerQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query user_following: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var followerUserID int32
		if err := rows.Scan(&followerUserID); err != nil {
			return nil, fmt.Errorf("failed to scan user_following row: %w", err)
		}
		followerUserIDs = append(followerUserIDs, followerUserID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user_following rows: %w", err)
	}

	// If there are no followers, return an empty list
	if len(followerUserIDs) == 0 {
		return []*store.User{}, nil
	}

	// Create a placeholder string for the IN clause
	placeholders := "(" + strings.TrimSuffix(strings.Repeat("?,", len(followerUserIDs)), ",") + ")"

	// Query user table to get details of the follower users
	userQuery := fmt.Sprintf(`
SELECT id, username, role, email, nickname, avatar_url, description, created_ts, updated_ts, row_status 
FROM user 
WHERE id IN %s`, placeholders)

	// Prepare the statement with the userQuery (optional but recommended for performance and security)
	stmt, err := d.db.PrepareContext(ctx, userQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare user query: %w", err)
	}
	defer stmt.Close()

	// Create a slice of interface{} to hold the followerUserIDs
	followerUserIDsInterfaces := make([]interface{}, len(followerUserIDs))
	for i, id := range followerUserIDs {
		followerUserIDsInterfaces[i] = id
	}

	// Execute the statement with the followerUserIDs
	rows, err = stmt.QueryContext(ctx, followerUserIDsInterfaces...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute user query: %w", err)
	}
	defer rows.Close()

	var users []*store.User
	for rows.Next() {
		user := &store.User{} // 使用取地址操作符分配内存
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
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over user rows: %w", err)
	}

	return users, nil
}
