require("dotenv").config();
const { URL } = require("url");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const port = process.env.PORT || 3001;
const connectionString = process.env.MONGODB_APP_CONNECTION_STRING;

mongoose.connect(connectionString);

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
);

const submissionSchema = new mongoose.Schema({
  userid: String,
  data: mongoose.Schema.Types.Mixed,
});

const userSchema = new mongoose.Schema({
  userId: String,
  allowedUrls: [String],
});

const User = mongoose.model("User", userSchema);

async function checkOriginAndUserId(req, res, next) {
  const origin = req.headers.origin;
  const userid = req.body.userid.toString();

  const user = await User.findOne({ userId: userid });

  if (!user) {
    return res.status(400).send("User not found");
  }

  // Parse the origin and get the domain
  const originDomain = new URL(origin).hostname;

  // Check if any of the allowedUrls includes the origin domain
  const isAllowed = user.allowedUrls.some((url) => {
    const allowedDomain = new URL(url).hostname;
    return allowedDomain === originDomain;
  });

  if (isAllowed) {
    next();
  } else {
    console.log(user.allowedUrls);
    res.status(403).send("Forbidden");
  }
}

app.get("/", async (req, res) => {
  res.status(200).send("Hello World!");
});

app.post("/submission", checkOriginAndUserId, async (req, res) => {
  if (!req.body.userid) {
    return res.status(400).send("No user id provided");
  }

  const modelName = "Submission_" + req.body.userid;
  const SubmissionModel =
    mongoose.models[modelName] || mongoose.model(modelName, submissionSchema);

  const submission = new SubmissionModel({
    userid: req.body.userid,
    data: req.body,
  });

  try {
    await submission.save();
    res.status(200).send("Submission saved!");
  } catch (error) {
    res.status(500).send("Error saving submission: " + error);
  }
});

app.listen(port);
