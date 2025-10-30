import { Request, Response, NextFunction } from "express";
import { pool } from "../db/connect";

export default {
  createAvatar: (req: Request, res: Response, next: NextFunction) => {
    console.log("req.body:", req.body);
  },
};
