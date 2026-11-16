import os
import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    server_text = f.read()

def extract_handler_details(route_call_prefix):
    pos = server_text.find(route_call_prefix)
    if pos == -1:
        raise ValueError(f"Route call not found: {route_call_prefix}")
    
    m = re.search(r'(async\s*)?\((?:_?[a-zA-Z0-9]+,\s*_?[a-zA-Z0-9]+(?:,\s*_?[a-zA-Z0-9]+)?)\)\s*=>\s*\{', server_text[pos:])
    if not m:
        raise ValueError(f"Handler not found for: {route_call_prefix}")
    
    is_async = bool(m.group(1))
    handler_rel_start = m.start()
    body_rel_start = m.end() - 1
    
    call_header = server_text[pos : pos + handler_rel_start]
    
    body_abs_start = pos + body_rel_start
    depth = 0
    i = body_abs_start
    in_string = None
    while i < len(server_text):
        char = server_text[i]
        if in_string:
            if char == '\\':
                i += 2
                continue
            elif char == in_string:
                in_string = None
        else:
            if char in ("'", '"', '`'):
                in_string = char
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    body = server_text[body_abs_start : i + 1]
                    return {
                        'is_async': is_async,
                        'body': body,
                        'call_header': call_header
                    }
        i += 1
    raise ValueError(f"Unmatched braces for: {route_call_prefix}")

# Module configurations: (domain, controller_filename, route_filename, controller_imports, route_imports, routes_list)
# Each item in routes_list: (call_prefix, method, route_path, handler_name, middlewares)

modules_config = [
    {
        'domain': 'auth',
        'controller_file': 'backend/controllers/authController.js',
        'route_file': 'backend/routes/authRoutes.js',
        'controller_imports': """'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { generateSecret, generateTOTP, verifyTOTP, getOtpAuthUrl } = require('../utils/totp');
const { generateToken, hashToken, validatePasswordRules, auditLog } = require('../utils/helpers');
const { issueSessionTokens, JWT_SECRET, BCRYPT_ROUNDS, REFRESH_EXPIRES_DAYS } = require('../middleware/auth');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, loginLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');
""",
        'routes': [
            ("app.post('/api/login'", 'post', '/login', 'login', 'loginLimiter'),
            ("app.post('/api/auth/mfa/verify'", 'post', '/auth/mfa/verify', 'verifyMfa', 'authLimiter'),
            ("app.post('/api/auth/mfa/setup'", 'post', '/auth/mfa/setup', 'setupMfa', 'authenticate'),
            ("app.post('/api/auth/mfa/confirm'", 'post', '/auth/mfa/confirm', 'confirmMfa', 'authenticate'),
            ("app.post('/api/auth/first-access/validate'", 'post', '/auth/first-access/validate', 'validateFirstAccess', 'authLimiter'),
            ("app.post('/api/auth/first-access/set-password'", 'post', '/auth/first-access/set-password', 'setPasswordFirstAccess', 'authLimiter'),
            ("app.post('/api/auth/refresh'", 'post', '/auth/refresh', 'refreshToken', ''),
            ("app.post('/api/auth/logout'", 'post', '/auth/logout', 'logout', 'authenticate'),
            ("app.post('/api/auth/password/change'", 'post', '/auth/password/change', 'changePassword', 'authenticate'),
            ("app.post('/api/auth/password/forgot'", 'post', '/auth/password/forgot', 'forgotPassword', 'authLimiter'),
            ("app.post('/api/auth/password/reset'", 'post', '/auth/password/reset', 'resetPassword', 'authLimiter'),
        ]
    },
    {
        'domain': 'admin',
        'controller_file': 'backend/controllers/adminController.js',
        'route_file': 'backend/routes/adminRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
""",
        'routes': [
            ("app.get('/api/admin/audit-logs'", 'get', '/admin/audit-logs', 'getAuditLogs', "authenticate, authorize('sistema:audit')"),
            ("app.get('/api/admin/diagnostics'", 'get', '/admin/diagnostics', 'getDiagnostics', "authenticate, authorize('sistema:diagnostics')"),
            ("app.get('/api/admin/migrate-fix'", 'get', '/admin/migrate-fix', 'runMigrateFix', ''),
        ]
    },
    {
        'domain': 'user',
        'controller_file': 'backend/controllers/userController.js',
        'route_file': 'backend/routes/userRoutes.js',
        'controller_imports': """'use strict';
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { validatePasswordRules, auditLog, normalizeRank } = require('../utils/helpers');
const { BCRYPT_ROUNDS } = require('../middleware/auth');
const { AVATARS_DIR } = require('../middleware/upload');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
""",
        'routes': [
            ("app.get('/api/me'", 'get', '/me', 'getMe', 'authenticate'),
            ("app.put('/api/me/profile'", 'put', '/me/profile', 'updateProfile', 'authenticate'),
            ("app.post('/api/me/avatar'", 'post', '/me/avatar', 'uploadAvatar', "authenticate, uploadAvatar.single('avatar')"),
            ("app.delete('/api/me/avatar'", 'delete', '/me/avatar', 'deleteAvatar', 'authenticate'),
            ("app.delete('/api/me'", 'delete', '/me', 'deleteMe', 'authenticate'),
            ("app.get('/api/usuarios'", 'get', '/usuarios', 'getUsers', "authenticate, authorize('usuarios:read')"),
            ("app.get('/api/militares/not-users'", 'get', '/militares/not-users', 'getMilitaresNotUsers', "authenticate, authorize('usuarios:read')"),
            ("app.post('/api/usuarios'", 'post', '/usuarios', 'createUser', "authenticate, authorize('usuarios:admin')"),
            ("app.delete('/api/usuarios/:id'", 'delete', '/usuarios/:id', 'deleteUser', "authenticate, authorize('usuarios:admin')"),
            ("app.put('/api/usuarios/:id/status'", 'put', '/usuarios/:id/status', 'updateUserStatus', "authenticate, authorize('usuarios:bloquear')"),
            ("app.put('/api/usuarios/:id/reset-first-access'", 'put', '/usuarios/:id/reset-first-access', 'resetFirstAccess', "authenticate, authorize('usuarios:reset')"),
            ("app.put('/api/usuarios/:id/admin'", 'put', '/usuarios/:id/admin', 'updateUserAdmin', "authenticate, authorize('usuarios:admin')"),
            ("app.put('/api/usuarios/:id/senha'", 'put', '/usuarios/:id/senha', 'updateUserPassword', "authenticate, authorize('usuarios:reset')"),
            ("app.get('/api/usuarios/:id/permissoes'", 'get', '/usuarios/:id/permissoes', 'getUserPermissionsDirect', ''),
            ("app.put('/api/usuarios/:id/permissoes'", 'put', '/usuarios/:id/permissoes', 'updateUserPermissionsDirect', ''),
        ]
    },
    {
        'domain': 'rbac',
        'controller_file': 'backend/controllers/rbacController.js',
        'route_file': 'backend/routes/rbacRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const rbacController = require('../controllers/rbacController');
const { authenticate, authorize } = require('../middleware/auth');
""",
        'routes': [
            ("app.get('/api/roles'", 'get', '/roles', 'getRoles', "authenticate, authorize('usuarios:admin')"),
            ("app.get('/api/roles/:id'", 'get', '/roles/:id', 'getRoleById', "authenticate, authorize('usuarios:admin')"),
            ("app.post('/api/roles'", 'post', '/roles', 'createRole', "authenticate, authorize('usuarios:admin')"),
            ("app.put('/api/roles/:id'", 'put', '/roles/:id', 'updateRole', "authenticate, authorize('usuarios:admin')"),
            ("app.delete('/api/roles/:id'", 'delete', '/roles/:id', 'deleteRole', "authenticate, authorize('usuarios:admin')"),
            ("app.get('/api/permissions'", 'get', '/permissions', 'getPermissions', "authenticate, authorize('usuarios:admin')"),
            ("app.put('/api/usuarios/:id/roles'", 'put', '/usuarios/:id/roles', 'updateUserRoles', "authenticate, authorize('usuarios:admin')"),
        ]
    },
    {
        'domain': 'mySchedules',
        'controller_file': 'backend/controllers/mySchedulesController.js',
        'route_file': 'backend/routes/mySchedulesRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { getMilitarFromUser, formatDateToISO, normalizeRank } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const mySchedulesController = require('../controllers/mySchedulesController');
const { authenticate } = require('../middleware/auth');
""",
        'routes': [
            ("app.get('/api/my-schedules'", 'get', '/my-schedules', 'getMySchedules', 'authenticate'),
            ("app.get('/api/my-schedules/:id'", 'get', '/my-schedules/:id', 'getMyScheduleById', 'authenticate'),
        ]
    },
    {
        'domain': 'volunteer',
        'controller_file': 'backend/controllers/volunteerController.js',
        'route_file': 'backend/routes/volunteerRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { formatDateToISO, parseDayToDate, getCurrentMonthKey, getMonthName, auditLog } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { authenticate } = require('../middleware/auth');
""",
        'routes': [
            ("app.get('/api/volunteers'", 'get', '/volunteers', 'getVolunteers', ''),
            ("app.get('/api/months'", 'get', '/months', 'getMonths', ''),
            ("app.post('/api/volunteers'", 'post', '/volunteers', 'createVolunteer', 'authenticate'),
            ("app.delete('/api/volunteers/:id'", 'delete', '/volunteers/:id', 'deleteVolunteer', 'authenticate'),
            ("app.put('/api/volunteers/:id'", 'put', '/volunteers/:id', 'updateVolunteer', 'authenticate'),
            ("app.put('/api/volunteers/:id/cancel-availability'", 'put', '/volunteers/:id/cancel-availability', 'cancelAvailability', ''),
        ]
    },
    {
        'domain': 'efetivo',
        'controller_file': 'backend/controllers/efetivoController.js',
        'route_file': 'backend/routes/efetivoRoutes.js',
        'controller_imports': """'use strict';
const XLSX = require('xlsx');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { normalizeRank, padCpf, deepCleanText, normalizeKey, formatPhone, isEmpty, auditLog } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const efetivoController = require('../controllers/efetivoController');
const { uploadMemory } = require('../middleware/upload');
""",
        'routes': [
            ("app.get('/api/efetivo'", 'get', '/efetivo', 'getEfetivo', ''),
            ("app.get('/api/efetivo/desenvolvedores'", 'get', '/efetivo/desenvolvedores', 'getDesenvolvedores', ''),
            ("app.post('/api/efetivo'", 'post', '/efetivo', 'createEfetivo', ''),
            ("app.put('/api/efetivo/:id'", 'put', '/efetivo/:id', 'updateEfetivo', ''),
            ("app.get('/api/efetivo/lookup/:matricula'", 'get', '/efetivo/lookup/:matricula', 'lookupEfetivo', ''),
            ("app.delete('/api/efetivo/:id'", 'delete', '/efetivo/:id', 'deleteEfetivo', ''),
            ("app.post('/api/efetivo/import/preview'", 'post', '/efetivo/import/preview', 'importEfetivoPreview', "uploadMemory.single('file')"),
            ("app.post('/api/efetivo/import'", 'post', '/efetivo/import', 'importEfetivo', "uploadMemory.single('file')"),
        ]
    },
    {
        'domain': 'opm',
        'controller_file': 'backend/controllers/opmController.js',
        'route_file': 'backend/routes/opmRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const opmController = require('../controllers/opmController');
""",
        'routes': [
            ("app.get('/api/opms'", 'get', '/opms', 'getOpms', ''),
            ("app.post('/api/opms'", 'post', '/opms', 'createOpm', ''),
            ("app.put('/api/opms/:id'", 'put', '/opms/:id', 'updateOpm', ''),
            ("app.delete('/api/opms/:id'", 'delete', '/opms/:id', 'deleteOpm', ''),
        ]
    },
    {
        'domain': 'ciclo',
        'controller_file': 'backend/controllers/cicloController.js',
        'route_file': 'backend/routes/cicloRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { formatDateToISO, auditLog } = require('../utils/helpers');
const { recalculateMetas } = require('../services/ScaleOptimizationService');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const cicloController = require('../controllers/cicloController');
const { authenticate, authorize } = require('../middleware/auth');
""",
        'routes': [
            ("app.get('/api/ciclos'", 'get', '/ciclos', 'getCiclos', ''),
            ("app.get('/api/ciclos/:id'", 'get', '/ciclos/:id', 'getCicloById', ''),
            ("app.post('/api/ciclos'", 'post', '/ciclos', 'createCiclo', ''),
            ("app.put('/api/ciclos/:id'", 'put', '/ciclos/:id', 'updateCiclo', ''),
            ("app.delete('/api/ciclos/:id'", 'delete', '/ciclos/:id', 'deleteCiclo', ''),
            ("app.get('/api/ciclos/:id/metas'", 'get', '/ciclos/:id/metas', 'getCicloMetas', ''),
            ("app.put('/api/metas/:id'", 'put', '/metas/:id', 'updateMeta', ''),
            ("app.delete('/api/metas/:id'", 'delete', '/metas/:id', 'deleteMeta', ''),
            ("app.get('/api/ciclos/:id/gastos-matriz'", 'get', '/ciclos/:id/gastos-matriz', 'getGastosMatriz', ''),
            ("app.post('/api/ciclos/:id/gastos-matriz'", 'post', '/ciclos/:id/gastos-matriz', 'saveGastosMatriz', ''),
            ("app.get('/api/ciclos/:id/gastos-matriz/sync-escala'", 'get', '/ciclos/:id/gastos-matriz/sync-escala', 'syncGastosEscala', ''),
            ("app.get('/api/ciclo-config'", 'get', '/ciclo-config', 'getCicloConfig', ''),
            ("app.put('/api/ciclo-config'", 'put', '/ciclo-config', 'updateCicloConfig', "authenticate, authorize('ciclos:update')"),
        ]
    },
    {
        'domain': 'servico',
        'controller_file': 'backend/controllers/servicoController.js',
        'route_file': 'backend/routes/servicoRoutes.js',
        'controller_imports': """'use strict';
const XLSX = require('xlsx');
const db = require('../db');
const { formatDateToISO, isFeriado, auditLog, normalizeRank } = require('../utils/helpers');
const { recalculateMetas } = require('../services/ScaleOptimizationService');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const servicoController = require('../controllers/servicoController');
const { uploadMemory } = require('../middleware/upload');
""",
        'routes': [
            ("app.get('/api/servicos'", 'get', '/servicos', 'getServicos', ''),
            ("app.post('/api/servicos'", 'post', '/servicos', 'createServico', ''),
            ("app.put('/api/servicos/:id'", 'put', '/servicos/:id', 'updateServico', ''),
            ("app.delete('/api/servicos/:id'", 'delete', '/servicos/:id', 'deleteServico', ''),
            ("app.post('/api/servicos/corrigir-cargas'", 'post', '/servicos/corrigir-cargas', 'corrigirCargas', ''),
            ("app.delete('/api/servicos/ciclo/:cicloId'", 'delete', '/servicos/ciclo/:cicloId', 'deleteServicosCiclo', ''),
            ("app.post('/api/servicos/import/preview'", 'post', '/servicos/import/preview', 'importServicosPreview', "uploadMemory.single('file')"),
            ("app.post('/api/servicos/import'", 'post', '/servicos/import', 'importServicos', "uploadMemory.single('file')"),
        ]
    },
    {
        'domain': 'schedule',
        'controller_file': 'backend/controllers/scheduleController.js',
        'route_file': 'backend/routes/scheduleRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { formatDateToISO, auditLog, normalizeRank } = require('../utils/helpers');
const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
""",
        'routes': [
            ("app.get('/api/schedules'", 'get', '/schedules', 'getSchedules', ''),
            ("app.post('/api/schedules'", 'post', '/schedules', 'createSchedule', ''),
            ("app.delete('/api/schedules/patrol'", 'delete', '/schedules/patrol', 'deletePatrol', ''),
        ]
    },
    {
        'domain': 'report',
        'controller_file': 'backend/controllers/reportController.js',
        'route_file': 'backend/routes/reportRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { formatDateToISO, normalizeRank } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
""",
        'routes': [
            ("app.get('/api/reports/operacional-detalhado'", 'get', '/reports/operacional-detalhado', 'getOperacionalDetalhado', ''),
            ("app.get('/api/reports/disponibilidade-grid'", 'get', '/reports/disponibilidade-grid', 'getDisponibilidadeGrid', ''),
            ("app.get('/api/reports/escalas-planejadas'", 'get', '/reports/escalas-planejadas', 'getEscalasPlanejadas', ''),
            ("app.get('/api/reports/conferencia'", 'get', '/reports/conferencia', 'getConferencia', ''),
        ]
    },
    {
        'domain': 'financeiro',
        'controller_file': 'backend/controllers/financeiroController.js',
        'route_file': 'backend/routes/financeiroRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { formatDateToISO } = require('../utils/helpers');
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
""",
        'routes': [
            ("app.get('/api/tipos-servico'", 'get', '/tipos-servico', 'getTiposServico', ''),
            ("app.post('/api/tipos-servico'", 'post', '/tipos-servico', 'createTipoServico', ''),
            ("app.put('/api/tipos-servico/:id'", 'put', '/tipos-servico/:id', 'updateTipoServico', ''),
            ("app.get('/api/financeiro/resumo'", 'get', '/financeiro/resumo', 'getFinanceiroResumo', ''),
            ("app.get('/api/financeiro/detalhado'", 'get', '/financeiro/detalhado', 'getFinanceiroDetalhado', ''),
        ]
    },
    {
        'domain': 'import',
        'controller_file': 'backend/controllers/importController.js',
        'route_file': 'backend/routes/importRoutes.js',
        'controller_imports': """'use strict';
const db = require('../db');
const { processFile } = require('../services/RequirementImporter');
let pdfParser;
try {
  pdfParser = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse nao disponivel');
}
""",
        'route_imports': """'use strict';
const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { authenticate } = require('../middleware/auth');
const { uploadPdf, handleUploadError } = require('../middleware/uploadValidation');
""",
        'routes': [
            ("app.post(\n    '/api/import/volunteers/files'", 'post', '/import/volunteers/files', 'importVolunteersFiles', "authenticate, uploadPdf.array('files'), handleUploadError"),
            ("app.post(\n    '/api/import/preview'", 'post', '/import/preview', 'importPreview', "authenticate, uploadPdf.single('file'), handleUploadError"),
            ("app.get('/api/import/logs'", 'get', '/import/logs', 'getImportLogs', 'authenticate'),
        ]
    }
]

# Write all controllers and routes
for mod in modules_config:
    domain = mod['domain']
    ctrl_file = mod['controller_file']
    route_file = mod['route_file']
    
    ctrl_code = mod['controller_imports'] + f"\nconst {domain}Controller = {{}};\n\n"
    route_code = mod['route_imports'] + "\n"
    
    for prefix, method, path, handler_name, mws in mod['routes']:
        details = extract_handler_details(prefix)
        body = details['body']
        async_str = "async " if details['is_async'] else ""
        
        # Add handler to controller
        ctrl_code += f"/**\n * {method.upper()} {path}\n */\n"
        ctrl_code += f"{domain}Controller.{handler_name} = {async_str}(req, res, next) => {body};\n\n"
        
        # Add route to router
        mw_str = f"{mws}, " if mws else ""
        route_code += f"router.{method}('{path}', {mw_str}{domain}Controller.{handler_name});\n"
    
    ctrl_code += f"module.exports = {domain}Controller;\n"
    route_code += "\nmodule.exports = router;\n"
    
    with open(ctrl_file, 'w', encoding='utf-8') as f:
        f.write(ctrl_code)
    with open(route_file, 'w', encoding='utf-8') as f:
        f.write(route_code)
        
    print(f"Generated {ctrl_file} and {route_file} ({len(mod['routes'])} routes)")

print("\nAll 14 controllers and 14 route files successfully generated!")

