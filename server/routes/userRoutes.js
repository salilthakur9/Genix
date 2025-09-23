import express from 'express';
import { auth } from '../middlewares/auth.js';
import {getUserCreations} from '../controllers/userController.js';


const userRouter= express.Router();

userRouter.get('/get-user-creations', auth, getUserCreations);

export default userRouter;