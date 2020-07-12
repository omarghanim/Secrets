require("dotenv").config();
const express = require("express");
const mongoose =require("mongoose");
const bodyParser=require("body-parser");
const ejs = require("ejs");
// const md5 = require("md5");
// const encrypt = require("mongoose-encryption");
// const bcrypt = require("bcrypt");
// const saltRounds=10;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var findOrCreate = require('mongoose-findorcreate')


const app = express();

// console.log(process.env.API_KEY);
// console.log(md5("12345"));
app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret:"Our little secret",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true , useUnifiedTopology: true });
mongoose.set("useCreateIndex","true");
const userSchema = new mongoose.Schema({
  email : String,
  password : String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/secrets",function(req,res){
  User.find({"secret":{$ne:null}},function(err,foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets",{usersWithSecrets:foundUsers});
      }
    }
  })
    // if(req.isAuthenticated()){
    //   res.render("secrets");
    // }else{
    //   res.redirect("/login");
    // }
})
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/")
})

app.get('/auth/google',
  passport.authenticate('google', { scope:["profile"]}
));

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
})

app.post("/submit",function(req,res){
  const submittedSecret = req.body.secret;
  console.log(req.user._id);
  User.findById(req.user._id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  })

});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    })
  }
  })

  });


app.post("/login",function(req,res){
    const user = new User({
      username:req.body.username,
      password:req.body.password
    });

      req.login(user,function(err){
        if(err){
          console.log(err);
          res.redirect("/register");
        }else{
          passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
          });
        }
      })

});


app.listen(3000,function(res){
  console.log("Successfully Connected to port 3000");
});
