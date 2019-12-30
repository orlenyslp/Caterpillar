import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as mongoose from 'mongoose';

import * as path from 'path';
import models from './models/models.controller';

const app: express.Express = express();

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/', models);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  var err = new Error('Not Found');
  err['status'] = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {

  app.use((error: any, req, res, next) => {
    console.log(error);
    res.status(error['status'] || 500);
    res.render('error', {
      message: error.message,
      error
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((error: any, req, res, next) => {
  res.status(error['status'] || 500);
  res.render('error', {
    message: error.message,
    error: {}
  });
  return null;
});

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/caterpillarRepo', function(error){
   if(error){
      throw error;
   }else{
      console.log('Conectado a MongoDB');
   }
});

app.use(bodyParser.urlencoded({
  limit: "50mb",
  extended: false
}));
app.use(bodyParser.json({limit: "50mb"}));

export default app;
