require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const multer = require("multer");
var fs = require('fs');
var path = require('path');
require('mongoose-type-email');

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");



const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/myapp', {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: {type: mongoose.SchemaTypes.Email, required:true, unique:true},
  username : {type: String, unique: true, required:true},
  firstname: {type: String, required: true},
  lastname:{type: String, required: true},
  pincode: {type: Number, required: true},
  cart: [String]
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const bookSchema = new mongoose.Schema({
   name: String,
   orignalPrice: Number,
   price: Number,
   lenderName: String,
   authorName: String,
   img: {
     data: Buffer,
     contentType: String
   },
   description: String,
   timestamp: { type: Date, default: Date.now},
   category: String,
   location: Number
});

const Book = new mongoose.model("Book", bookSchema);

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

var upload = multer({ storage: storage })



app.get("/",function(req,res){
  res.render("initial");
})

app.get("/register", function(req,res){
  res.render("register");
});

app.post("/register",function(req,res){

  Users=new User({email: req.body.email, username : req.body.username, firstname:  req.body.firstname,  lastname: req.body.lastname, pincode:  req.body.pincode });
  User.register(Users, req.body.password, function(err,user){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
          res.redirect("/homePage");
      });
    }
  });
});

app.get("/login", function(req,res){
  res.render("login");
});


app.post("/login",function(req,res){
  const user = new User({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/homePage");
      });
    }
  })
})

app.get('/form', (req, res) => {
  if(req.isAuthenticated()){
    console.log(req.user);
    res.render("form");
  }
  else{
    res.redirect("/login");
  }
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("homePage");
})

app.post('/form', upload.single('image'), (req, res, next) => {

   var amount = req.body.amount;
    var obj = {
        name: req.body.name,
        description: req.body.desc,
        orignalPrice: req.body.orignalPrice,
        price: "2000",
        img: {
            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
            contentType: 'image/png'
        },
        lenderName: req.user.username,
        authorName: req.body.authorName,
        category: req.body.tags,
        location: req.user.location
    }
    Book.create(obj, (err, item) => {
        if (err) {
            console.log(err);
        }
        else {
            // item.save();
            res.redirect('/homePage');
        }
    });
});

app.get("/homePage",function(req,res){

  if(req.query.search){
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Book.find({ "name": regex }, function(err, foundBooks) {
           if(err) {
               console.log(err);
           } else {
              res.render("homePage", { items: foundBooks });
           }
       });

  }else{
    Book.find({}, (err, items) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred', err);
        }
        else {
            res.render('homePage', { items: items });
        }
    });
  }
});

app.post("/cart",function(req,res){


  if(req.isAuthenticated()){
    console.log(req.user.username);
    console.log(req.body.bookId);
    console.log("Below is empty cart size:")
    console.log(req.user.cart.size);
    const cartElement = "Life of Pie";
    req.user.cart.push(req.body.bookId.name);
    console.log(req.user.cart);
  }
  else{
    res.redirect("/login");
  }
})

app.listen("3000", function(){

    console.log("Server started at 3000");
})



function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};
