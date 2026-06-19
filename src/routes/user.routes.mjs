import { Router } from 'express';
import * as controller from '../controllers/user.controller.mjs';

const router = Router();

router.post('/',      controller.createUser);
router.get('/',       controller.getAllUsers);
router.get('/:id',    controller.getUserById);
router.patch('/:id',  controller.updateUser);
router.delete('/:id', controller.deleteUser);

export default router;
