import express from 'express';
import jwt from 'jsonwebtoken';
import Blog from '../Schema/Blog.js';
import User from '../Schema/User.js';
const router = express.Router();

const verifyJWT = (req , res , next) => {
    
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(" ")[1];

    if(token === null){
        return res.status(401).json({ error : "No access token"})
    }

    jwt.verify(token , process.env.SECRET_ACCESS_KEY , (err , user) => {
        if(err){
            return res.status(403).json({error : "access token is invalid"})
        }
        req.user = user.id
        next();
    })
}

router.post('/create-blog', verifyJWT , async(req,res) => {
    try {
        let authorId = req.user;
        let {title , des , banner , tags , content , draft } = req.body;
        // return res.status(200).json({title , des , banner , tags , content , daft})
        if(!title.length){
            return res.status(403).json({error : "You must provide a title to publish the blog"})
        }

        if(!draft){
            if(!banner.length){
                return res.status(403).json({error : "You must provide blog banner to publish it"})
            }
            if(!content.blocks.length){
                return res.status(403).json({error : "There must be some blog content to publish it"})
            }
            if(!tags.length || tags.length > 10){
                return res.status(403).json({error : "Provide tags in order to publish the blog , Maximum 10"})
            }
            if(!des.length){
                return res.status(403).json({error : "You must provide blog description under 200 characters"})
            }
        }
        tags = tags.map(tag => tag.toLowerCase());
        let blog_id = title.replace(/[^a-zA-Z0-9]/g , ' ').replace(/\s+/g, "-").trim() + new Date().getTime().toString();
        let blog = new Blog({
            title, des,banner , content , tags , author : authorId , blog_id , draft:Boolean(draft)
        })

        blog.save().then(blog => {
            let incrementVal = draft ? 0 : 1;
            User.findOneAndUpdate({_id : authorId} , {$inc : {"account_info.total_posts" : incrementVal}, $push : {
                "blogs" : blog._id
            }}).then(user => {
                return res.status(200).json({ id:blog.blog_id})
            }).catch(err => {
                return res.status(500).json({error : "Fail to update total posts number"})
            })
        }).catch(err => {
            return res.status(500).json({error : err.message})
        })
        console.log(blog_id);
    } catch (error) {
        return res.status(500).json({error : error , "fromme" : "gogo"})
    }
})

export default router;