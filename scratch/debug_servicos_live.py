import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('192.168.1.18', username='vps_9bpm', password='asdf1234')

cmds = [
    ("Frontend file check", "docker exec ft-frontend grep -n 'filtersReady' /app/src/components/ServicosExecutadosManager.jsx"),
    ("Docker ps", "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.Status}}'"),
    ("Backend getServicos test", """docker exec ft-backend node -e '
const http = require("http");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "gsvr_secret_key_2026_pmal";
const token = jwt.sign({ id: 1, nome: "Teste", perfil: "ADMINISTRADOR", is_superuser: true }, secret, { expiresIn: "5m" });
function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: 3001, path, method: "GET", headers: { Authorization: "Bearer " + token } }, res => {
      let d = "";
      res.on("data", x => d += x);
      res.on("end", () => resolve({ status: res.statusCode, len: d.length, rows: (() => { try { const j = JSON.parse(d); return Array.isArray(j) ? j.length : j; } catch { return d.slice(0,200); } })() }));
    });
    req.on("error", reject);
    req.end();
  });
}
(async () => {
  console.log("NO FILTER:", await get("/api/servicos"));
  console.log("CICLO 7:", await get("/api/servicos?ciclo_id=7&data_inicio=2026-10-16&data_fim=2026-11-15"));
  console.log("CICLO 6:", await get("/api/servicos?ciclo_id=6&data_inicio=2026-09-16&data_fim=2026-10-15"));
})();
'"""),
]

for title, cmd in cmds:
    print(f"=== {title} ===")
    _, out, err = c.exec_command(cmd)
    print("OUT:", out.read().decode())
    e = err.read().decode()
    if e:
        print("ERR:", e)

c.close()

