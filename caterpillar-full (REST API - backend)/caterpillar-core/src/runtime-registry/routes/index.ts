import { Router } from 'express';
const router: Router = Router();

import * as registryCtrl from '../controllers/registry-controller';

router.post('/registries', registryCtrl.deployRuntimeRegistry);
router.get('/registries/:registryAddress/address', registryCtrl.getRuntimeRegistryInfo);
router.get('/registries/:registryId', registryCtrl.getRuntimeRegistryInfo);

module.exports = router;