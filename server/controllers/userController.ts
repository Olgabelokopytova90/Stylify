import bcrypt from "bcrypt";

import type { Request, Response, NextFunction } from "express";

import type { RequestHandler } from "express";
import pool from "../db/connect";
import { AVATAR_BY_SHAPE } from "../utils/avatarMap";

interface UserController {
  createUser: RequestHandler;
  getUsers: RequestHandler;
  getUserById: RequestHandler;
  updateUser: RequestHandler;
  updateUserById: RequestHandler;
  deleteUser: RequestHandler;
}
const userController = {} as UserController;

userController.createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email, password, age, gender, body_shape, style_pref } =
      req.body ?? {};

    const ageNum = Number(age);

    if (
      !username ||
      !email ||
      !password ||
      !body_shape ||
      !style_pref ||
      !Number.isFinite(ageNum) ||
      !gender
    ) {
      return next({ status: 400, message: "Missing or invalid fields" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const dup = await pool.query("SELECT 1 FROM users WHERE email = $1", [
      email,
    ]);
    if (dup.rowCount) {
      return next({ status: 409, message: "Email already exists" });
    }

    const avatar_image_url = AVATAR_BY_SHAPE[body_shape] || null;

    const queryCreateUser = `INSERT INTO users (username, email, password, age, gender, body_shape, style_pref, avatar_image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;

    const params = [
      username,
      email,
      hashed,
      ageNum,
      gender,
      body_shape,
      style_pref,
      avatar_image_url,
    ];
    const { rows } = await pool.query(queryCreateUser, params);

    return res.status(201).json(rows[0]);
  } catch (error) {
    return next({
      status: 400,
      message: { error },
    });
  }
};

userController.updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId) || !userId) {
      return next({
        log: "updateUser: invalid id",
        status: 400,
        message: { err: "Invalid or missing user id in route params" },
      });
    }

    const { username, email, age, gender, body_shape, style_pref } =
      req.body ?? {};
    const ageNum = Number(age);

    if (
      !username ||
      !email ||
      !gender ||
      !body_shape ||
      !style_pref ||
      !Number.isFinite(ageNum)
    ) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const avatar_image_url = AVATAR_BY_SHAPE[body_shape] ?? null;
    const query = `UPDATE users SET username = $1, email = $2, age = $3, gender = $4, body_shape = $5, style_pref = $6, avatar_image_url = $7, updated_at = NOW() WHERE user_id = $8 RETURNING * `;

    const params = [
      username,
      email,
      ageNum,
      gender,
      body_shape,
      style_pref,
      avatar_image_url,
      userId,
    ];

    const { rows } = await pool.query(query, params);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    next({ status: 500, message: error });
  }
};

userController.updateUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const {
      username,
      email,
      age,
      gender,
      body_shape,
      style_pref,
      avatar_image_url,
    } = req.body ?? {};
    const ageNum = age !== undefined ? Number(age) : undefined;

    const autoAvatar =
      body_shape && avatar_image_url === undefined
        ? AVATAR_BY_SHAPE[body_shape] ?? null
        : avatar_image_url ?? null;
    const query = `UPDATE users SET username = COALESCE($1, username),
          email    = COALESCE($2, email),
          age      = COALESCE($3, age),
          gender   = COALESCE($4, gender),
          body_shape = COALESCE($5, body_shape),
          style_pref = COALESCE($6, style_pref),
          avatar_image_url = COALESCE($7, avatar_image_url),
          updated_at = NOW()
      WHERE user_id = $8 RETURNING *`;
    const params = [
      username,
      email,
      ageNum !== undefined && Number.isFinite(ageNum) ? ageNum : null,
      gender,
      body_shape,
      style_pref,
      autoAvatar,
      userId,
    ];
    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (e) {
    next({ status: 500, message: e || e });
  }
};
userController.getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = `SELECT * FROM users ORDER BY user_id DESC`;

    const { rows } = await pool.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    return next({
      log: `Error in starWarsController.getCharacters: ${error}`,
      status: 500,
      message: { error: "Database query failed in getUsers" },
    });
  }
};

userController.getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || !userId) {
      return next({
        log: "updateUser: invalid id",
        status: 400,
        message: { err: "Invalid or missing user id in route params" },
      });
    }

    const query = `SELECT id, username, email, body_shape FROM users WHERE user_id = $1`;

    const { rows } = await pool.query(query, [userId]);

    if (!rows.length) return res.status(404).json({ error: "user not found" });

    const user = rows[0];
    const avatar_image_url =
      AVATAR_BY_SHAPE[user.body_shape?.toLowerCase()] ??
      "/images/models/body_oval.png";

    return res.status(200).json({ ...user, avatar_image_url });
  } catch (error) {
    return next({
      log: `Error in getUserById: ${error}`,
      status: 500,
      message: { error: "Database query failed in getUserById" },
    });
  }
};

userController.deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const query = `DELETE FROM users Where user_id = $1 RETURNING * `;

    const { rows } = await pool.query(query, [userId]);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser: rows[0],
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete user" });
  }
};
export default userController;
