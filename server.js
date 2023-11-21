import express from 'express';
import mongoose from 'mongoose';
import dotenv, { config } from 'dotenv';
import bcrypt from 'bcrypt';
import User from './Schema/User.js';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from 'firebase-admin'
import serviceAccountKey from './react-mern-mongodb-firebase-adminsdk-ckg8x-1ba22056d5.json' assert { type: "json" };
import {getAuth} from "firebase-admin/auth";
dotenv.config()



const server = express();

server.use(express.json());
const corsOptions = {
    origin: '*', // หรือ '*' ถ้าไม่ใช้ credentials
    credentials: true,
  };
server.use(cors(corsOptions));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)
})

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

mongoose.connect(process.env.DB_LOCATION , {
    autoIndex: true,
})
.then(() => console.log('connect success to mongodb'))
.catch(() => console.log('connect fail'));

const formatDatatoSend = (user) => {

    const access_token = jwt.sign({id : user._id } , process.env.SECRET_ACCESS_KEY )

    return {
        access_token,
        profile_img : user.personal_info.profile_img,
        username : user.personal_info.username,
        fullname : user.personal_info.fullname
    }
}

server.post('/' , (req,res) => {
    res.send("this api is running...");
})

server.post('/signup' , async (req,res) => {
    try {
        const {fullname , email , password } = req.body;

        if(fullname?.length < 3){
            return res.status(403).json({"msg" : "Fullname must be a least 3"})
        }

        if(!email?.length){
            return res.status(403).json({"msg" : "Enter email address"})
        }

        if(!emailRegex.test(email)){
            return res.status(403).json({ "msg" : "Email invalid"})
        }

        if(!passwordRegex.test(password)){
            return res.status(403).json({"msg" : "Password should be 6 to 20 charactor long with a numberic , 1 lowercase and 1 uppercase"})  
        }

        const hash_password = await bcrypt.hash(password , 10)

        const username = email.split('@')[0];

        const user = new User({
            personal_info : {
                fullname,
                email,
                password : hash_password,
                username,
            }
        })

        const userDoc = await user.save();

        return res.status(200).json(formatDatatoSend(userDoc))

    } catch (error) {
        if(error.code === 11000){
            return res.status(404).json({"msg" : "Email Aleary Exits"})
        }
        return res.status(500).json({"msg" : error})
    }
})

server.post('/signin' ,async (req,res) => {
    try {
        const {email , password } = req.body;

        const findEmail = await User.findOne({"personal_info.email" : email})

        if(!findEmail) {
            return res.status(403).json({ msg: "Email not found" });
        }

        if(findEmail.google_auth){
            return res.status(403).json({ msg: "This Email Authentication wiht Google , Pls Continue with google" });
        }

        const correctPassword = await bcrypt.compare(password,findEmail.personal_info.password);

        if(!correctPassword){
            return res.status(403).json({ msg: "Incorrect password" });
        }

        return res.status(200).json(formatDatatoSend(findEmail))

    } catch (error) {
        return res.status(500).json({"msg" : error});
    }
})

server.post('/google-auth' , async (req, res) => {
    let {access_token } = req.body;

    try {
        const UserfromGoogleAuth = await getAuth().verifyIdToken(access_token);
        // return res.json(UserfromGoogleAuth);
        const findEmail = await User.findOne({"personal_info.email" : UserfromGoogleAuth.email})
        if(findEmail){
            if(!findEmail.google_auth){
                return res.status(403).json({"msg" : "This email was signed up with password , Please log in with password to access the account"})
            }
            return res.status(200).json(formatDatatoSend(findEmail))
        }

        const { email , name , picture  } = UserfromGoogleAuth;
        const username = email.split('@')[0];
        const newUser = new User({
            personal_info:{
                fullname : name , 
                email : email , 
                // profile_img : picture ,
                username } , 
            google_auth:true
        })

        const UserDoc = await newUser.save();
        return res.status(200).json(formatDatatoSend(UserDoc));

    } catch (error) {
        return res.json(error)
    }

    // getAuth().verifyIdToken(access_token).then(async(decodeUser) => {
    //     let { email , name , picture } = decodeUser; // true

    //     picture = picture.replace("s96-3" , "s384-c");

    //     let user = await User.findOne({"personal_info.email" : email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u) => {
    //         return u || null;
    //     }).catch((err) => {
    //         console.log(err);
    //         return res.status(500).json({msg:err.message})
    //     })

    //     if(user){
    //         return console.log("haha")
    //         if(!user.google_auth){
    //             return res.status(403).json({"error" : "This email was signed up with google , Please log in with password to access the account"})
    //         }else{
    //             return res.status(403).json({"error" : "this sjflsfjlsjfl"})
    //             const username = email.split('@')[0];
    //             user = new User({
    //                 personal_info:{fullname : name , email, profile_img : picture , username } , 
    //                 google_auth:true
    //             })

    //             await user.save().then((u) => {
    //                 user = u;
    //             })
    //             .catch((err) => {
    //                 return res.status(500).json("error" , err.message);
    //             })
    //         }

    //         return res.status(200).json(formatDatatoSend(user));
    //     }
    // })
    // .catch((err) => {
    //     return res.status(500).json("error" , "Failed to authenticate with goodle , try with some other account");
    // });

})

server.listen(3000 , () => {
    console.log('server is running on port 3000');
})