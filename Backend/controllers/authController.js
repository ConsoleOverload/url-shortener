import { registerUser, loginUser } from '../services/userService.js';

/**
 * Controller to handle user registration.
 */
export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await registerUser({ email, password });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle user login.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
