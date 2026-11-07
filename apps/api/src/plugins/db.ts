import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createDb, createRepositories, resolveDatabaseFile, type Db, type Repositories } from "@smart-plant/db";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    repos: Repositories;
  }
}

export default fp(
  async function dbPlugin(app: FastifyInstance) {
    const { db, sqlite } = createDb({ file: resolveDatabaseFile() });
    const repos = createRepositories(db);

    app.decorate("db", db);
    app.decorate("repos", repos);

    app.addHook("onClose", (_instance, done) => {
      sqlite.close();
      done();
    });
  },
  { name: "dbPlugin" },
);
