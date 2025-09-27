import { Router } from "express";
import create from './create.js'
import read from "./read.js";
import search from "./search.js";
import update from "./update.js";
import publish from "./publish.js";
import unpublish from "./unpublish.js";
import remove from './remove.js';
import byClub from "./byClub.js";
import saves from "./saves.js";
import translations from "./translations.js";
import validate from "./validate.js";
import following from "./following.js";

const router = Router();

router.use(create);
router.use(read);
router.use(search);
router.use(update);
router.use(publish);
router.use(unpublish);
router.use(remove);
router.use(byClub);
router.use(saves);
router.use(translations);
router.use(validate);
router.use(following);

export default router;
