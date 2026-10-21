// Run in the unconfigured distribution copy before every template release.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("..",import.meta.url));
const skip=new Set([".git","node_modules","dist",".wrangler",".sites-runtime",".vinext",".next"]);
const forbiddenName=/^(?:\.env(?:\..*)?|.*\.(?:db|sqlite|sqlite3|pem|key|tar|gz|zip)|\.setup|artifacts|pilot)$/i;
const sensitive=[/appgprj_[a-z0-9]+/i,/Automation_[a-z0-9]+/i,/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.chatgpt\.site/i,/\b(?:charl|pretorius|clint|syntech|sani|genfin|thornybush|hdavidson|s4auto|neoautomai8|fuzzygnome6)\b/i,/\bM7 Group\b/i,/\b(?:ghp|gho|sk-proj)_[A-Za-z0-9]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const errors=[];
function walk(dir){for(const item of readdirSync(dir,{withFileTypes:true})){if(skip.has(item.name))continue;const full=path.join(dir,item.name),relative=path.relative(root,full);if(item.isSymbolicLink()){errors.push(`symlink: ${relative}`);continue;}if(forbiddenName.test(item.name))errors.push(`excluded material: ${relative}`);if(item.isDirectory()){walk(full);continue;}if(!/\.(?:png|woff2|ico|jpg)$/.test(item.name)){const text=readFileSync(full,"utf8");if(relative!==path.join("scripts","audit-template.mjs")&&sensitive.some(rx=>rx.test(text)))errors.push(`personal identity, runtime ID or secret pattern: ${relative}`);}}}
walk(root);
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("PASS: template identity/runtime/credential-pattern and excluded-file audit (not a substitute for human diff review)");
