import { Router } from 'express';

const processes:Router = Router();

/* GET processes listing. */
processes.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

export default processes;
