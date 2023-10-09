import { json } from "express";
import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";
import cloudinary from "cloudinary";
import fs from "fs/promises"   
import sendEmail from "../utils/sendEmail.js";
import crypto from 'crypto';
const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 *1000,  //7 days
    httpOnly: true,  // taki js se kuch kr n ske client se
    secure: true
}

const register = async(req, res, next) => {
   const {fullName, email, password } = req.body;

   if(!fullName || !email || !password) {       //sare error message ko handle krne k liye error.util.js file bnayi hai

     return next(new AppError('All Field are requires', 400));
   }

   const userExists = await User.findOne({email});

   if(userExists){
    return next(new AppError('Email already exists', 400));
   }

   const user = await User.create({
    fullName,
    email,
    password,
    avatar:{
        public_id: email,
        secure_url: 'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg'
    },
     });
  

    if(!user){
        return next(new AppError('user registration fail please try again',400));
    }
     
  
    //Todo : file upload
    console.log('File details ->', JSON.stringify(req.file));
    if(req.file){
    
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {         //ye format npmjs clodinary pe mil jayega
          folder: 'lms',
          width: 250,
          height: 250,
          gravity: 'faces',
          crop: 'fill'
        });
        if (result) {
          user.avatar.public_id = result.public_id;
          user.avatar.secure_url = result.secure_url;

          //remove file from server( local system)  , cloudinary pe to rhegi
          fs.rm(`uploads/${req.file.filename}`)

        }
      } catch (e) {
        return next(
          new AppError(e ||'File not uploaded, please try again',500)
        )
      }
    }

    await user.save();

    user.password = undefined

    const token = await user.generateJWTToken();

    res.cookie('token',token, cookieOptions)

// jb user register ho jaye
    res.status(201).json({
        success: true,
        message: 'User register succesfully',
        user,
    }); 
   

};

const login =async (req, res, next) => {

    try {
        const {email,password}  = req.body;

  if(!email || !password){
    return next(new AppError('All fields are required',400));
  }

  const user= await User.findOne({
    email
  }).select ('+password');

   if(!user || !user.comparePassword(password)){
     return next(new AppError('Email or password does not match',400));
  }

  const token = await user.generateJWTToken();
  user.password = undefined;

  res.cookie('token',token, cookieOptions);

  res.status(200).json({
    success: true,
    message: 'User logged in succesfully',
    user,
  });
    } catch (e) {
        return next(new AppError(e.message,500)); 
    }

  
};

const logout = (req, res) => {
    res.cookie('token', null, {
      secure: true,
      maxAge: 0,
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logout succesfully'
    })

};

const getProfile =async (req, res) => {
   try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: 'User detail',
      user
    })
   } catch (e) {
    return next(new AppError('Fail to fetch user detail',500));
   }
   
};

// const forgotPassword= async (req, res, next) => {
// const {email}= req.body;

//   if(!email){
//   return next(new AppError('Email is required',400));
//   }

//   const user = await User.findOne({email});
//   if(!user){
//     return next(new AppError('Email not registered',400));
//   }

//   const resetToken = await user.generatePasswordResetToken();
   
//   await user.save();

//   const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

//   const subject ='Reset Password';
//   const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;


//   try {
//     await sendEmail(email, subject, message);
//     res.status(200).json({
//       success: true,
//       message: `Reset password token has been sent to ${email} succesfully`
//     });
//   } catch (e) {
//     user.forgotPasswordExpiry = undefined;
//     user.forgotPasswordToken = undefined;     //jb mail ft jaye to expiry,tkon ko undefine kr diya for security reason
    
//     await user.save();

//     return next(new AppError('Something went wrong, please try again.',500));
//   }

// };


//notworking
 const forgotPassword = async (req, res, next) => {
  // Extracting email from request body
  const { email } = req.body;

  // If no email send email required message
  if (!email) {
    return next(new AppError('Email is required', 400));
  }

  // Finding the user via email
  const user = await User.findOne({ email });

  // If no email found send the message email not found
  if (!user) {
    return next(new AppError('Email not registered', 400));
  }

  // Generating the reset token via the method we have in user model
  const resetToken = await user.generatePasswordResetToken();

  // Saving the forgotPassword* to DB
  await user.save();

  // constructing a url to send the correct data
  /**HERE
   * req.protocol will send if http or https
   * req.get('host') will get the hostname
   * the rest is the route that we will create to verify if token is correct or not
   */
  // const resetPasswordUrl = `${req.protocol}://${req.get(
  //   "host"
  // )}/api/v1/user/reset/${resetToken}`;
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  console.log(resetPasswordUrl);
  // We here need to send an email to the user with the token
  const subject = 'Reset Password';
  const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

  try {
    await sendEmail(email, subject, message);

    // If email sent successfully send the success response
    res.status(200).json({
      success: true,
      message: `Reset password token has been sent to ${email} successfully`,
    });
  } catch (error) {
    // If some error happened we need to clear the forgotPassword* fields in our DB
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save();

    return next(
      new AppError(
        error.message || 'Something went wrong, please try again.',
        500
      )
    );
  }
};
//not working
const resetPassword= async (req, res , next) => {
  const { resetToken} = req.params;
  const { password } = req.body;

  const forgotPasswordToken = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');

  const user =  await User.findOne({
    forgotPasswordToken,
    forgotPasswordExpiry: { $gt: Date.now()}
  });
  if (!user) {
    return next(
      new AppError('Token is invalid  or expiry, please try again',400)
    )
  }
  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  user.save();

  res.status(200).json({
    success: true,
    message: 'Password change successfully!!'
  })
}

const changePassword = async (req,res) => {
const {oldPassword, newPassword} = req.body;
const  {id} = req.user;

if(!oldPassword || !newPassword){
  return next(
    new AppError('All field are mandatory',400)
  )
}
const user = await User.findById(id).select('+password');

if(!user){
  return next(
    new AppError('user does not exists',400)
  )
}

const isPasswordValid = await user.comparePassword(oldPassword);

if(!isPasswordValid){
  return next(
    new AppError('Invalid old password',400)
  )
}

user.password = newPassword;

await user.save();

user.password = undefined;

res.status(200).json({
  success: true,
  message: 'password changed succesfully'
});
}

const updateUser = async (req,res) => {
const{ fullName} = req.body;
const { id}= req.user.id;

const user = await User.findById(id);
if(!user){
  return next(
    new AppError('User does not exists',400)
  )
}
if(req.fullName){
  user.fullName = fullName;
}

if(req.file){   //profile pic
 await cloudinary.v2.uploader.destroy(user.avatar.public_id);  //delete old pic

 try {
  const result = await cloudinary.v2.uploader.upload(req.file.path, {         //ye format npmjs clodinary pe mil jayega
    folder: 'lms',
    width: 250,
    height: 250,
    gravity: 'faces',
    crop: 'fill'
  });
  if (result) {
    user.avatar.public_id = result.public_id;
    user.avatar.secure_url = result.secure_url;

    //remove file from server( local system)  , cloudinary pe to rhegi
    fs.rm(`uploads/${req.file.filename}`)

  }
} catch (e) {
  return next(
    new AppError(e ||'File not uploaded, please try again',500)
  )
}
}   

await user.save();

res.status(200).json({
success:true,
message: 'User details updated successfully'
});

} 

export {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser

}