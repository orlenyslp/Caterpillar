import {Router} from 'express';
const router: Router = Router();

import * as processModelsCtrl from '../controllers/process-models-controller';
import * as processInstancesCtrl from "../controllers/process-instances-controller"

router.post('/models/compile', processModelsCtrl.compileProcessModels);
router.post('/models', processModelsCtrl.deployProcessModels);
router.get('/models', processModelsCtrl.queryProcessModels);
router.get('/models/:mHash', processModelsCtrl.retrieveModelMetadata);

router.post('/models/:mHash/processes', processInstancesCtrl.createNewProcessInstance);
router.get('/models/:mHash/processes', processInstancesCtrl.queryProcessInstances);
router.get('/processes/:pAddress', processInstancesCtrl.queryProcessState);
router.put('/worklists/:wlAddress/workitems/:wiIndex', processInstancesCtrl.executeWorkitem);

module.exports = router;





