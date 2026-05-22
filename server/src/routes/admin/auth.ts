import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../prisma.js";
import { config } from "../../config.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { loginSchema } from "../../validators/auth.js";
import { success, fail } from "../../lib/response.js";

const router = Router();

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { login, password } = req.body;
    const loginValue = String(login);
    const passwordValue = String(password);
    const { login: envLogin, password: envPassword } = config.admin;

    let user = await prisma.adminUser.findUnique({ where: { login: loginValue } });

    if (!user) {
      if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
        const passwordHash = await bcrypt.hash(passwordValue, 12);
        user = await prisma.adminUser.create({ data: { login: loginValue, passwordHash } });
      } else {
        fail("INVALID_CREDENTIALS", "Invalid credentials.", 401);
      }
    } else {
      const ok = await bcrypt.compare(passwordValue, user.passwordHash);
      if (!ok) {
        if (envLogin && envPassword && loginValue === envLogin && passwordValue === envPassword) {
          const passwordHash = await bcrypt.hash(passwordValue, 12);
          user = await prisma.adminUser.update({
            where: { id: user.id },
            data: { passwordHash },
          });
        } else {
          fail("INVALID_CREDENTIALS", "Invalid credentials.", 401);
        }
      }
    }

    const userId = user.id;
    const userLogin = user.login;
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.adminUserId = userId;
    req.session.adminLogin = userLogin;
    success(res, { login: userLogin });
  }),
);

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

router.get("/me", (req, res) => {
  if (!req.session.adminUserId) {
    return res
      .status(401)
      .json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
  }
  return res.json({ ok: true, data: { login: req.session.adminLogin } });
});

export default router;
