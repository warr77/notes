const express = require("express");
const router = express.Router();

const formidable = require("formidable");

const fs = require("fs");
const {
  signin,
  signout,
  signup,
  createPost,
  requireSignin,
  isAuth,
  verifyToken,
  getPost,
  updatePost,
  deletePost,
  viewPost,
  getbytitle,
  share,
  getUsersByName,
} = require("../controller/auth");
const bodyParser = require("body-parser");
// const group=require('./group')
//router.post('/signin',sign);
// router.get('/signup',(req,res)=>{
//     res.status(200).json("hello");
// });

router.post("/signin", signin);

router.post("/signup", signup);
router.post("/post", verifyToken, isAuth, createPost);
router.get("/post", verifyToken, isAuth, getPost);
router.put("/post", updatePost);
router.delete("/post", verifyToken, isAuth, deletePost);
router.get("/viewpost", verifyToken, isAuth, viewPost);
router.get("/search", verifyToken, isAuth, getbytitle);
router.post("/share", verifyToken, isAuth, share);
router.get("/userbyname", verifyToken, isAuth, getUsersByName);
// router.post('/group/create',creategroup);
// router.get('/list/groups',listgroups);
// router.post('/list/msg',listmsg);
// router.get('/img/:prodid',photo);

// router.param("userId",userById)
// router.param("prodid",prodid)

module.exports = router;
