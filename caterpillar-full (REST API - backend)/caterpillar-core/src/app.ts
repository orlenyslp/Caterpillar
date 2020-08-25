import { setIFlowNodeElement } from './interpretation-engine/services/process-setup-handler/registration-mediator';
import * as express from "express";
import * as logger from "morgan";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as mongoose from "mongoose";
import * as http from "http";

// import router from "./compilation-engine/routes/index";
// import registryRouter from "./runtime-registry/routes/index";

const app: express.Express = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

//app.use("/models", router);
app.use("/", require("./compilation-engine/routes/index"));
app.use("/", require("./runtime-registry/routes/index"));
app.use("/", require("./interpretation-engine/routes/index"));
app.use("/", require("./dynamic-access-control/routes/index"));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error("Not Found");
  err["status"] = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use((error: any, req, res, next) => {
    console.log(error);
    res.status(error["status"] || 500);
    res.render("error", {
      message: error.message,
      error,
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((error: any, req, res, next) => {
  res.status(error["status"] || 500);
  res.render("error", {
    message: error.message,
    error: {},
  });
  return null;
});

mongoose.connect("mongodb://localhost:27017/caterpillarRepo", {
  useNewUrlParser: true,
  useFindAndModify: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

mongoose.connection.once("open", async () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on("error", () => {
  console.log("Error connecting to MongoDB");
});

// WebSocket
const WebSocket = require("ws");
const server = http.createServer(express);
const wss = new WebSocket.Server({ server });

export let webSocket;
let port = 8090;

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(message: any) {});
  ws.on("error", () => {});
  webSocket = ws;
});

server.listen(port, function () {
  console.log(`Server is listening on ${port}!`);
});

export let sendThroughSocket = (message: string) => {
   if(webSocket)
     webSocket.send(message)
}

export default app;
