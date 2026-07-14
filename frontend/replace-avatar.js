import fs from 'fs';
import path from 'path';
function walk(dir) {
  for (let f of fs.readdirSync(dir)) {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.jsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let o = c;
      o = o.replace(/\{user\?\.avatar\s*\|\|\s*"[^"]+"\}/g, 
        `{user?.avatar?.startsWith("data:image") ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : (user?.avatar || "🧑‍🎓")}`);
      o = o.replace(/\{f\.avatar\}/g,
        `{f.avatar?.startsWith("data:image") ? <img src={f.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : f.avatar}`);
      o = o.replace(/\{conv\.friend\.avatar\}/g,
        `{conv.friend.avatar?.startsWith("data:image") ? <img src={conv.friend.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : conv.friend.avatar}`);
      o = o.replace(/\{activeChat\.friend\.avatar\}/g,
        `{activeChat.friend.avatar?.startsWith("data:image") ? <img src={activeChat.friend.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : activeChat.friend.avatar}`);
      o = o.replace(/\{student\.avatar\}/g,
        `{student.avatar?.startsWith("data:image") ? <img src={student.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : student.avatar}`);
      // Wait, there's a user.avatar without ? in leaderboard
      o = o.replace(/\{user\.avatar\}/g,
        `{user.avatar?.startsWith("data:image") ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : user.avatar}`);
      if (o !== c) {
        fs.writeFileSync(p, o, 'utf8');
        console.log('Updated avatar in', p);
      }
    }
  }
}
walk('/Users/apple/Downloads/learnly-ai/src');
