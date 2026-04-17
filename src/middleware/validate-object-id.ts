import { Request, Response, NextFunction } from "express";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function validateObjectId(param: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[param];
    if (!OBJECT_ID_REGEX.test(value)) {
      res.status(400).json({
        status: 400,
        message: "Invalid ID format",
      });
      return;
    }
    next();
  };
}
