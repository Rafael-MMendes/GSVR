import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

auth_controller_code = """'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { generateSecret, generateTOTP, verifyTOTP, getOtpAuthUrl } = require('../utils/totp');
const { 
  generateToken, 
  hashToken, 
  validatePasswordRules, 
  auditLog 
} = require('../utils/helpers');
const { 
  issueSessionTokens, 
  JWT_SECRET, 
  BCRYPT_ROUNDS, 
  REFRESH_EXPIRES_DAYS 
} = require('../middleware/auth');

const authController = {};
"""

auth_routes = [
    ('login', 432, 558),
    ('verifyMfa', 559, 590),
    ('setupMfa', 591, 611),
    ('confirmMfa', 612, 637),
    ('validateFirstAccess', 638, 724),
    ('setPasswordFirstAccess', 725, 797),
    ('refreshToken', 798, 828),
    ('logout', 829, 841),
    ('changePassword', 842, 875),
    ('forgotPassword', 876, 925),
    ('resetPassword', 926, 960)
]

for name, s, e in auth_routes:
    chunk = lines[s-1:e]
    # Find start of async (req, res)
    start_idx = 0
    for idx, l in enumerate(chunk[:5]):
        if 'async (req, res)' in l:
            start_idx = idx
            break
    chunk = chunk[start_idx:]
    chunk[0] = f"authController.{name} = async (req, res) => {{"
    
    # Clean end
    end_idx = len(chunk) - 1
    while end_idx >= 0 and not chunk[end_idx].strip():
        end_idx -= 1
    if chunk[end_idx].strip() == '});':
        chunk[end_idx] = '};'
    elif chunk[end_idx].strip().endswith('});'):
        chunk[end_idx] = re.sub(r'\}\s*\)\s*;$', '};', chunk[end_idx])

    auth_controller_code += '\n' + '\n'.join(chunk[:end_idx+1]) + '\n'

auth_controller_code += "\nmodule.exports = authController;\n"

with open('backend/controllers/authController.js', 'w', encoding='utf-8') as f:
    f.write(auth_controller_code)

print("backend/controllers/authController.js written.")
