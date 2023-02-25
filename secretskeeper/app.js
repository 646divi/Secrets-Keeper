require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
mongoose.set('strictQuery', true);
app.use(session({
    secret: '--You#Need#Permission#--',
    resave: false,
    saveUninitialized: false
        // cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session()); //using passport to manage our sessions

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true }); // connnecting to database at its default port.
//after connecting to the database we need to create the schema for our db
//schema is nothing but similar to a simple js object
// mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// const secret = "agarKuchChaiyeToMeriPermissionLagegi";
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
//mongoose will encrypt when we will save and decrypt when we will find
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


//next stepo is to create a model and one thing to remember collection name must be singular
const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user.id);
    });
});

passport.deserializeUser(function(id, cb) {
    User.findById(id, (err, user) => {
        cb(err, user);
    })
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function(err, user) {
            return cb(err, user);
        });
    }
));


app.get("/", (req, res) => {
    res.render("home")
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.get("/login", (req, res) => {
    res.render("login")
});

app.get("/register", (req, res) => {
    res.render("register")
});


app.get("/secrets", (req, res) => {
    //here we will cross check wheathr user is authenticated or not using isAuthenticated()
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
        console.log("no");
    }
})
app.post("/register", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    //User.register() method comes from passport, which saves a lots of effort to everytime create a user object and make it directly interact with mongodb instead we will use passport-local-moongose to be a middleman 
    User.register({ username: username }, password, (err, user) => {
        //callbback function returns error if someting went wrong otherwise we have a new user bingooo.

        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                //why route to secrets becaause we are authenticating user and setting up a logged in session for them, as, if they went to directly secret page they will be able to see just bcoz they are authenticated.
                res.redirect("/secrets");
            });
        }
        //Type of authentication "local" if user was authenticated callback function will be called

    });
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, (err) => {
        if (err) console.log(err);
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

// app.post("/register", (req, res) => {
//     //As soon as client make a post request a new user has been created now we need to put this user info into db
//     const newUser = User({
//         email: req.body.username,
//         password: md5(req.body.password)
//     });
//     newUser.save((err) => {
//         if (err) console.log("err");
//         else res.render("secrets")
//     });
// });


// app.post("/login", (req, res) => {
//     const username = req.body.username;
//     const password = md5(req.body.password);
//     User.findOne({ email: username }, (err, foundOne) => {
//         if (err) console.log(err);
//         else {
//             if (foundOne && foundOne.password == password) {
//                 console.log("found");
//                 res.render("secrets");
//             }
//         };
//     });
// });



app.listen(3000, () => {
    console.log("Server started at localhost:3000/");
})