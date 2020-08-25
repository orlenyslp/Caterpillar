import { Router } from "express";
const router: Router = Router();

import * as roleBindingCtrl from "./../controllers/role-binding-controller";
import * as accessControlCtrl from "./../controllers/access-control-controler";

router.post("/rb-policy", roleBindingCtrl.parseAndDeployRBPolicy);
router.get("/rb-policy/:rbPolicyAddr", roleBindingCtrl.findRBPolicyMetadata);

router.post("/task-role-map", roleBindingCtrl.parseAndDeployTaskRoleMap);
router.get(
  "/task-role-map/:taskRoleMAddr",
  roleBindingCtrl.findRoleTaskMapMetadata
);

router.post("/access-control", accessControlCtrl.deployAccessControl);
router.get("/access-control/:accessCtrlAddr", accessControlCtrl.findAccessControlMetadata)

router.get("/rb-opertation/:pCase", accessControlCtrl.findPolicyAddresses)
router.get("/rb-opertation/:pCase/state", accessControlCtrl.findRoleState);
router.patch(
  "/rb-opertation/:pCase/nominate-creator",
  accessControlCtrl.nominateCaseCreator
);
router.patch("/rb-opertation/:pCase/nominate", accessControlCtrl.nominate);
router.patch("/rb-opertation/:pCase/release", accessControlCtrl.release);
router.patch("/rb-opertation/:pCase/vote", accessControlCtrl.vote);

module.exports = router;
