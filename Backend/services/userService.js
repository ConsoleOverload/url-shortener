import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';

/**
 * Business logic to register a new user.
 */
export const registerUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!validator.isEmail(cleanEmail)) {
    throw new AppError('Invalid email format.', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters long.', 400);
  }

  // Check if email already registered
  const existingUser = await User.findOne({ email: cleanEmail }).select('_id').lean();
  if (existingUser) {
    throw new AppError('Email is already registered.', 409);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const newUser = await User.create({
    email: cleanEmail,
    password: hashedPassword
  });

  // Generate JWT Token
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
  const token = jwt.sign({ id: newUser._id }, jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: {
      id: newUser._id,
      email: newUser.email,
      createdAt: newUser.createdAt
    }
  };
};

/**
 * Business logic to authenticate user login.
 */
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Generate JWT Token
  const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
  const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      createdAt: user.createdAt
    }
  };
};
