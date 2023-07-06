// const user = require("../models/user");
const { pool } = require("../dbConfig");
const jwt = require("jsonwebtoken");
const { expressjwt: expjwt } = require("express-jwt");
const formidable = require("formidable");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
require("dotenv").config();

async function checkPass(password, encryp) {
  enc = await bcrypt.compare(password, encryp);
  console.log("hased password", enc);
  if (enc) {
    return false;
  } else {
    return true;
  }
}

exports.signin = (req, res) => {
  //res.send("hello");

  const { email, password } = req.body;
  console.log(password);
  pool.query(
    `SELECT * FROM users
    WHERE email = $1`,
    [email],
    async (err, results) => {
      if (err || results.rows.length == 0) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "User with that email does not exist. Please signup",
          err: err,
        });
      } else if (
        (await checkPass(password, results.rows[0].password)) === true
      ) {
        return res.status(400).json({
          error: true,
          errmsg: "Invalid Password",
        });
      } else {
        console.log("sign token");
        const token = jwt.sign({ id: results.rows[0].id }, process.env.secret);
        res.cookie("t", token, { expire: new Date() + 9999 });
        const { id, name, email } = results.rows[0];
        return res.json({ token, user: { id, name, email }, error: false });
      }
    }
  );
};

exports.signout = (req, res) => {
  res.clearCookie("t");
  res.json({ message: "Signout success" });
  console.log("Signout success");
};

exports.signup = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, async (err, feilds, files) => {
    if (err) {
      //  return res.status(400).json({
      //      error:"image could not be uploaded"
      //  });
    }

    const { name, email, password } = feilds;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: true,
        errmsg: "enter all fields",
        err: err,
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: true,
        errmsg: "Password must be a least 6 characters long",
        err: err,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    pool.query(
      `SELECT * FROM users
              WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          return res.status(400).json({
            error: true,
            errmsg: "Email already registered",
            err: err,
          });
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
                      VALUES ($1, $2, $3)
                      RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                return res.status(400).json({ error: true, err: err });
              }
              console.log(results.rows);
              return res
                .status(200)
                .json({ success: "You are now registered. Please log in" });
            }
          );
        }
      }
    );
  });
};

exports.requireSignin = expjwt({
  secret: process.env.secret,
  algorithms: ["HS256"],
  userProperty: "auth",
});

exports.verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];

  if (typeof bearerHeader !== "undefined") {
    const bearerToken = bearerHeader.split(" ")[1];

    jwt.verify(bearerToken, process.env.secret, (err, authData) => {
      if (err) {
        res.status(403).json({
          error: true,
          errmsg: "Not Authorized",
        });
      } else {
        req.profileid = authData.id;
        // res.status(200).json({
        //     error: false,
        //     authData
        //   });
      }
    });

    next();
  } else {
    res.status(403).json({
      error: true,
      errmsg: "Authorization token not found",
    });
    return;
  }
};
exports.isAuth = (req, res, next) => {
  let user =
    req.profileid &&
    (req?.body?.userid || req?.query.id) &&
    (req?.body?.userid || req?.query.id) == req.profileid;

  if (!user) {
    return res.status(403).json({
      error: true,
      errmsg: "Access denied not a user",

      //   user: user,
    });
  }

  next();
};

// exports.isAdmin = (req, res, next) => {
//   if (req.profile.role === 0) {
//     return res.status(403).json({
//       error: "Admin resourse! Access denied",
//     });
//   }
//   next();
// };

//module.exports=respond;
//module.exports={sum};
//console.log("process",process)
exports.createPost = (req, res) => {
  //res.send("hello");

  const { title, body, userid } = req.body;

  pool.query(
    `INSERT INTO post (title, content, updated_by)
      VALUES ($1,$2,$3)RETURNING id;
   `,
    [title, body, userid],
    async (err, results) => {
      if (err || results.rows.length == 0) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        pool.query(
          ` INSERT INTO permissions (user_id, post_id, can_read, can_update, can_delete)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;`,
          [userid, results.rows[0].id, true, true, true],
          async (err, results) => {
            if (err || results.rows.length == 0) {
              // throw err;
              return res.status(400).json({
                error: true,
                errmsg: "Something went wrong",
                err: err,
              });
            } else {
              return res.json({ error: false, success: true });
            }
          }
        );
      }
    }
  );
};
exports.getPost = (req, res) => {
  //res.send("hello");
  console.log(req.query.userid, req.query.limit, req.query.offset);
  // const { title, body, userid } = req.body;

  // have directly added to query due to some error issue

  let str = `SELECT p.id, p.title, p.content, p.created_at, p.updated_at, p.updated_by, COUNT(*) OVER() AS total_count,pm.can_read,pm.can_delete,pm.can_update
    FROM post p
      JOIN permissions pm ON p.id = pm.post_id ${
        req?.query?.search && req?.query?.search != ""
          ? `and p.title ILIKE '%${req?.query?.search}%'`
          : ""
      }
      WHERE pm.user_id = ${req.profileid} AND pm.can_read = TRUE
      ORDER BY p.updated_at DESC
      LIMIT ${req.query.limit || 5} OFFSET `;
  let offset = ((req?.query.offset || 1) - 1) * (req.query.limit || 5);
  str = str + offset + ";";

  pool.query(
    str,
    [
      //   req.query.userid,
      //   req.query.limit || 5,
      //   req?.query.offset || 1,
      //   req?.query?.search || "",
    ],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.updatePost = (req, res) => {
  //res.send("hello");
  // console.log(req.query.userid, req.query.limit, req.query.offset);
  const { title, body, userid, postid } = req.body;

  pool.query(
    `UPDATE post 
      SET content = $1 ,title =$2 
      WHERE id = $3 
      AND EXISTS (SELECT 1 FROM permissions WHERE user_id = $4 AND can_update = true);
       `,
    [body, title, postid, userid],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.deletePost = (req, res) => {
  console.log(req.query.id, req.query.postid, req.profileid);

  pool.query(
    `DELETE FROM permissions
    WHERE post_id = $1
     AND EXISTS (SELECT 1 FROM permissions WHERE user_id = $2 AND can_delete = true);
     `,
    [req.query.postid, req.profileid],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({
          error: false,
          success: true,
          result: results.rows,
        });
        // pool.query(
        //   `DELETE FROM post
        // WHERE id= $1 ;
        //  `,
        //   [req.query.postid],
        //   async (err, results) => {
        //     if (err) {
        //       // throw err;
        //       return res.status(400).json({
        //         error: true,
        //         errmsg: err,
        //       });
        //     } else {
        //       return res.json({
        //         error: false,
        //         success: true,
        //         result: results.rows,
        //       });
        //     }
        //   }
        // );
      }
    }
  );
};

exports.deletePermission = (req, res) => {
  console.log(req.query.id, req.query.postid, req.profileid);

  pool.query(
    `DELETE FROM permissions
    WHERE user_id = $1
      AND post_id = $2
      AND (
        SELECT can_delete
        FROM permissions
        WHERE user_id = $3
          AND post_id = $2
      ) = TRUE;
     `,
    [req.query.user, req.query.postid, req.profileid],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({
          error: false,
          success: true,
          result: results.rows,
        });
      }
    }
  );
};

exports.viewPost = (req, res) => {
  //res.send("hello");
  // console.log(req.query.userid, req.query.limit, req.query.offset);
  const { title, body, userid, postid } = req.body;

  pool.query(
    `SELECT p.id, p.title, p.content, p.updated_at, p.updated_by,pm.can_read,pm.can_delete,pm.can_update FROM post p , permissions pm
    WHERE p.id = $1 AND pm.user_id=$2 and pm.post_id=$1 AND pm.can_read = true ;
      
         `,
    [req.query.postid, req.profileid],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.getbytitle = (req, res) => {
  //res.send("hello");
  console.log(req.query.userid, req.query.limit, req.query.offset);
  // const { title, body, userid } = req.body;
  console.log(`SELECT
post.id,
post.title,
post.content,
post.created_at,
post.updated_at,
post.updated_by,
permissions.can_read,
permissions.can_update,
permissions.can_delete,
COUNT(*) OVER() AS total_count
FROM
post
JOIN
permissions ON post.id = permissions.post_id
WHERE
post.title ILIKE ${req?.query?.search ? "'%" + req?.query?.search + "%'" : "%%"}
AND permissions.user_id = ${req.profileid}
AND permissions.can_read = true
ORDER BY
post.updated_at DESC LIMIT 5;`);
  pool.query(
    `SELECT
    post.id,
    post.title,
    post.content,
    post.created_at,
    post.updated_at,
    post.updated_by,
    permissions.can_read,
    permissions.can_update,
    permissions.can_delete,
    COUNT(*) OVER() AS total_count
    FROM
    post
    JOIN
    permissions ON post.id = permissions.post_id
    WHERE
    post.title ILIKE ${
      req?.query?.search ? "'%" + req?.query?.search + "%'" : "'%%'"
    }
    AND permissions.user_id = ${req.profileid}
    AND permissions.can_read = true
    ORDER BY
    post.updated_at DESC LIMIT 5; `,
    [],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.share = (req, res) => {
  //res.send("hello");

  const { postid, userid, otheruser } = req.body;
  console.log(postid, userid, otheruser);

  pool.query(
    `select * from post;
    INSERT INTO permissions (post_id, user_id, can_read, can_update, can_delete)
    SELECT ${postid}, ${otheruser}, true, false, false
    WHERE EXISTS (
    SELECT 1 FROM permissions
    WHERE post_id =  ${postid}
    AND user_id =  ${userid}
    AND can_delete = true
    )
    ON CONFLICT (post_id, user_id)
    DO UPDATE SET can_read = EXCLUDED.can_read, can_update = EXCLUDED.can_update, can_delete = EXCLUDED.can_delete;

         `,
    [],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.getUsersByName = (req, res) => {
  //res.send("hello");
  console.log(req.query.search, req.query.limit, req.query.offset);
  // const { title, body, userid } = req.body;

  pool.query(
    `SELECT id,name,email FROM users WHERE LOWER(name) ILIKE LOWER('%${
      req.query.search
    }%') AND id !=${req.profileid} ORDER BY id LIMIT ${
      req.query.limit || 10
    } ; `,
    [],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};

exports.getUsersByPost = (req, res) => {
  //res.send("hello");
  // console.log(req.query.search, req.query.limit, req.query.offset);
  // const { title, body, userid } = req.body;

  pool.query(
    `SELECT u.id, u.name
    FROM users u
    JOIN permissions p ON u.id = p.user_id
    WHERE p.post_id = $1
    AND p.can_delete = false
    AND p.can_read = true `,
    [req.query.search],
    async (err, results) => {
      if (err) {
        // throw err;
        return res.status(400).json({
          error: true,
          errmsg: "Something went wrong",
          err: err,
        });
      } else {
        return res.json({ error: false, success: true, result: results.rows });
      }
    }
  );
};
