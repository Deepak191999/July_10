import { Router } from "express";
import { login, register, logout, getProfile, forgotPassword, resetPassword, changePassword, updateUser,} from "../controllers/user.controller.js";
import  {isLoggedIn}  from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";
// import  isLoggedIn  from "../middlewares/auth.middleware.js";

const router = Router();  //instance     

router.post('/register',upload.single("avatar"), register);
router.post('/login',login);
router.get('/logout',logout);
router.get('/me', isLoggedIn, getProfile); 
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword);
 
router.post('/reset', forgotPassword);
router.post('/reset/:resetToken', resetPassword);
router.post('/change-password', isLoggedIn, changePassword);
router.put('/update', isLoggedIn, upload.single("avatar"), updateUser)
       

export default router;