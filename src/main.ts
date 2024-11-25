import Denomander from "https://deno.land/x/denomander/mod.ts";
import init from "./commands/init.ts";

const program = new Denomander({
  app_name: "Tgit",
  app_description: "Git implementation with TS",
  app_version: "1.0.1",
});

program.command("init", "Initializes a repository").action(() => {
  init();
});

program.parse(Deno.args);
