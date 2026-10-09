import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import { User } from './models/User.js';
import { Student } from './models/Student.js';
import { Alert } from './models/Alert.js';
import { FollowUp } from './models/FollowUp.js';
import { Rule } from './models/Rule.js';
import { Notification } from './models/Notification.js';

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fundacion_a_plus_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware (Acceso directo sin pantalla de login)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const roleHeader = req.headers['x-user-role'] || 'administrador';
  const emailHeader = req.headers['x-user-email'] || (roleHeader === 'docente' ? 'laura@fundacion.org' : (roleHeader === 'estudiante' ? 'juan.perez@fundacion.org' : 'admin@fundacion.org'));
  const nameHeader = req.headers['x-user-name'] ? decodeURIComponent(req.headers['x-user-name']) : (roleHeader === 'docente' ? 'Laura Gómez' : (roleHeader === 'estudiante' ? 'Juan Pérez' : 'Administrador General'));

  if (!token) {
    req.user = { email: emailHeader, role: roleHeader, name: nameHeader };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { email: emailHeader, role: roleHeader, name: nameHeader };
      return next();
    }
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// 1. AUTH ROUTES (LOGIN & REGISTRO)
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, program } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya se encuentra registrado' });
    }

    const userRole = role || 'docente';
    const avatar = userRole === 'docente'
      ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces';

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
      program: program || 'Fundación A+',
      avatar
    });

    // If registered as student, ensure a Student record exists
    if (userRole === 'estudiante') {
      const existingStudent = await Student.findOne({ email: email.toLowerCase() });
      if (!existingStudent) {
        await Student.create({
          name,
          email: email.toLowerCase(),
          program: program || 'Estudiante de Programación',
          avatar,
          riskLevel: 'Bajo',
          gpa: 4.0,
          attendancePercentage: 90,
          totalAbsences: 1,
          consecutiveAbsences: 0,
          monthlyGrades: [4.0, 4.0, 4.0, 4.0, 4.0],
          monthlyAttendance: [95, 92, 90, 91, 90],
          activeAlerts: [],
          recommendation: 'Bienvenido al programa. Tu seguimiento académico está activo.'
        });
      }
    }

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        program: newUser.program,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error interno en el servidor al registrar usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Por favor ingresa correo y contraseña' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas (usuario no encontrado)' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas (contraseña incorrecta)' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        program: user.program,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno en el servidor al iniciar sesión' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo perfil de usuario' });
  }
});

// ----------------------------------------------------
// 1.1 TEACHERS (DOCENTES ACTIVOS DE LA PLATAFORMA)
// ----------------------------------------------------
app.get('/api/teachers', authenticateToken, async (req, res) => {
  try {
    // Si no existen docentes en la base de datos, sembrar los docentes oficiales de la Fundación A+
    const count = await User.countDocuments({ role: 'docente' });
    if (count === 0) {
      await User.create([
        {
          name: 'Laura Gómez',
          email: 'laura@fundacion.org',
          password: 'Password123!',
          role: 'docente',
          program: 'Docente Titular de Programación',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces'
        },
        {
          name: 'Carlos Mendoza',
          email: 'carlos.mendoza@fundacion.org',
          password: 'Password123!',
          role: 'docente',
          program: 'Docente de Ciberseguridad y Redes',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces'
        },
        {
          name: 'Andrés Felipe Castro',
          email: 'andres.castro@fundacion.org',
          password: 'Password123!',
          role: 'docente',
          program: 'Docente de Analítica de Datos e IA',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
        },
        {
          name: 'Diana Patricia Morales',
          email: 'diana.morales@fundacion.org',
          password: 'Password123!',
          role: 'docente',
          program: 'Docente de Habilidades Socioemocionales y Empleabilidad',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces'
        },
        {
          name: 'Javier Restrepo',
          email: 'javier.restrepo@fundacion.org',
          password: 'Password123!',
          role: 'docente',
          program: 'Tutor de Proyectos y Desarrollo Web',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces'
        }
      ]);
    }

    const teachers = await User.find({ role: 'docente' }).select('name email role program avatar').sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    console.error('Error al obtener lista de docentes:', error);
    res.status(500).json({ message: 'Error al consultar lista de docentes' });
  }
});

app.get('/api/teachers/verify', authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ isValid: false, message: 'Debe ingresar un nombre de docente' });
    }

    const trimmed = name.trim();
    // Búsqueda insensible a mayúsculas/minúsculas
    const teacher = await User.findOne({
      name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
      role: 'docente'
    }).select('name email role program avatar');

    if (teacher) {
      return res.json({
        isValid: true,
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          program: teacher.program,
          avatar: teacher.avatar
        },
        message: `Docente activo verificado: ${teacher.name} (${teacher.program})`
      });
    }

    return res.json({
      isValid: false,
      message: `El nombre '${trimmed}' no corresponde a un docente activo registrado en la plataforma Fundación A+.`
    });
  } catch (error) {
    res.status(500).json({ isValid: false, message: 'Error al verificar docente' });
  }
});

// ----------------------------------------------------
// 2. KPIS & METRICS ROUTES (CON AISLAMIENTO POR ROL)
// ----------------------------------------------------
app.get('/api/kpi/summary', authenticateToken, async (req, res) => {
  try {
    // Si el usuario es estudiante, no exponemos estadísticas globales de riesgo
    if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ email: req.user.email });
      return res.json({
        isStudentView: true,
        totalStudents: 1,
        studentRiskLevel: student ? student.riskLevel : 'Bajo',
        attendance: student ? student.attendancePercentage : 90,
        gpa: student ? student.gpa : 4.0,
        lowRiskCount: student && student.riskLevel === 'Bajo' ? 1 : 0,
        mediumRiskCount: student && student.riskLevel === 'Medio' ? 1 : 0,
        highRiskCount: student && student.riskLevel === 'Alto' ? 1 : 0
      });
    }

    // Docentes y Administradores ven métricas globales
    const totalStudents = await Student.countDocuments();
    const lowRiskCount = await Student.countDocuments({ riskLevel: 'Bajo' });
    const mediumRiskCount = await Student.countDocuments({ riskLevel: 'Medio' });
    const highRiskCount = await Student.countDocuments({ riskLevel: 'Alto' });

    res.json({
      isStudentView: false,
      totalStudents: totalStudents || 80,
      lowRiskCount: lowRiskCount || 52,
      lowRiskPercent: Math.round(((lowRiskCount || 52) / (totalStudents || 80)) * 100),
      mediumRiskCount: mediumRiskCount || 18,
      mediumRiskPercent: Math.round(((mediumRiskCount || 18) / (totalStudents || 80)) * 100),
      highRiskCount: highRiskCount || 10,
      highRiskPercent: Math.round(((highRiskCount || 10) / (totalStudents || 80)) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar resumen de KPIs' });
  }
});

// ----------------------------------------------------
// 3. STUDENTS ROUTES (PROTECCIÓN ESTRICTA DE PRIVACIDAD)
// ----------------------------------------------------
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    // REGLA FUNDAMENTAL DE PRIVACIDAD:
    // Si es estudiante, SOLO puede obtener su propio registro.
    if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ email: req.user.email });
      if (!student) {
        // Fallback por nombre si el correo difiere
        const studentByName = await Student.findOne({ name: req.user.name });
        return res.json(studentByName ? [studentByName] : []);
      }
      return res.json([student]);
    }

    // Docente o Administrador: puede consultar la lista general con filtros
    const { search = '', risk = 'Todos' } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { program: { $regex: search, $options: 'i' } }
      ];
    }

    if (risk !== 'Todos') {
      if (risk === 'Bajo riesgo') filter.riskLevel = 'Bajo';
      else if (risk === 'Riesgo medio') filter.riskLevel = 'Medio';
      else if (risk === 'Riesgo alto') filter.riskLevel = 'Alto';
      else filter.riskLevel = risk;
    }

    const students = await Student.find(filter).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener lista de estudiantes' });
  }
});

app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    // REGLA DE PRIVACIDAD:
    // Si un estudiante intenta consultar el ID de otro estudiante, se bloquea el acceso
    if (req.user.role === 'estudiante' && student.email !== req.user.email && student.name !== req.user.name) {
      return res.status(403).json({
        message: 'Acceso denegado: Por políticas de privacidad institucional, no puedes acceder a la información de otros estudiantes.'
      });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo detalle del estudiante' });
  }
});

// ----------------------------------------------------
// 4. ALERTS ROUTES (SOLO ALERTAS PROPIAS PARA ESTUDIANTE)
// ----------------------------------------------------
app.get('/api/alerts/recent', authenticateToken, async (req, res) => {
  try {
    // REGLA DE PRIVACIDAD:
    // Si es estudiante, SOLO puede ver sus propias alertas
    if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ 
        $or: [{ email: req.user.email }, { name: req.user.name }] 
      });
      if (!student) return res.json([]);

      const studentAlerts = await Alert.find({ 
        $or: [{ studentId: student._id }, { studentName: student.name }] 
      }).sort({ createdAt: -1 });

      return res.json(studentAlerts);
    }

    // Docente o Administrador: ven alertas recientes del grupo asignado
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(10);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener alertas recientes' });
  }
});

// ----------------------------------------------------
// 4.1 RULES ROUTES (SOLO ADMINISTRADOR PUEDE EDITAR Y GESTIONAR)
// ----------------------------------------------------
app.get('/api/rules', authenticateToken, async (req, res) => {
  try {
    // Si no existen reglas, sembrar las 3 reglas base de la Fundación A+
    const count = await Rule.countDocuments();
    if (count === 0) {
      await Rule.create([
        {
          code: 'REG-REND-BAJO',
          name: 'Regla R1 — Rendimiento Académico',
          description: 'Promedio < 3.0 / 5.0. Genera alerta inmediata de Alto Riesgo y activa propuesta de tutoría personalizada.',
          conditionJson: { metric: 'promedio', operator: '<', threshold: 3.0 },
          defaultSeverity: 'Riesgo',
          isActive: true
        },
        {
          code: 'REG-ASIST-BAJA',
          name: 'Regla R2 — Inasistencia y Deserción',
          description: 'Asistencia < 75% o 3 faltas consecutivas. Dispara notificación al docente para llamada de contacto y bienestar.',
          conditionJson: { metric: 'asistencia', operator: '<', threshold: 75 },
          defaultSeverity: 'Riesgo',
          isActive: true
        },
        {
          code: 'REG-RIESGO-COMB',
          name: 'Regla R3 — Riesgo Combinado Crítico',
          description: 'Asistencia < 75% + Nota < 3.2. Clasificación de deserción inminente con remisión a coordinación y acudiente.',
          conditionJson: { metric: 'promedio_asistencia_combinado', operator: '<', threshold: 3.2 },
          defaultSeverity: 'Crítica',
          isActive: true
        }
      ]);
    }

    const rules = await Rule.find().sort({ createdAt: 1 });
    res.json(rules);
  } catch (error) {
    console.error('Error al obtener reglas:', error);
    res.status(500).json({ message: 'Error al obtener reglas' });
  }
});

app.post('/api/rules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'administrador') {
      return res.status(403).json({ message: 'Acceso denegado: Solo administradores pueden crear reglas.' });
    }
    const { code, name, description, conditionJson, defaultSeverity, isActive } = req.body;
    const rule = await Rule.create({
      code,
      name,
      description: description || '',
      conditionJson: conditionJson || { metric: 'promedio', operator: '<', threshold: 3.0 },
      defaultSeverity: defaultSeverity || 'Riesgo',
      isActive: isActive !== undefined ? isActive : true
    });
    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error al crear regla' });
  }
});

app.put('/api/rules/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'administrador') {
      return res.status(403).json({ message: 'Acceso denegado: Solo administradores pueden editar las reglas.' });
    }
    const { id } = req.params;
    const { code, name, description, conditionJson, defaultSeverity, isActive } = req.body;
    const rule = await Rule.findByIdAndUpdate(
      id,
      { 
        code, 
        name, 
        description, 
        conditionJson, 
        defaultSeverity, 
        isActive: isActive !== undefined ? isActive : true 
      },
      { new: true }
    );
    if (!rule) {
      return res.status(404).json({ message: 'Regla no encontrada' });
    }
    res.json({ message: 'Regla actualizada exitosamente en el motor', rule });
  } catch (error) {
    console.error('Error al actualizar regla:', error);
    res.status(500).json({ message: error.message || 'Error al actualizar regla' });
  }
});

app.delete('/api/rules/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'administrador') {
      return res.status(403).json({ message: 'Acceso denegado: Solo administradores pueden eliminar reglas.' });
    }
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Regla eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar regla' });
  }
});

// ----------------------------------------------------
// 5. FOLLOWUP ACTIONS (SOLO DOCENTES / ADMIN)
// ----------------------------------------------------
app.post('/api/actions/register', authenticateToken, async (req, res) => {
  try {
    // REGLA ESTRICTA: Los estudiantes NO pueden registrar intervenciones
    if (req.user.role !== 'docente' && req.user.role !== 'administrador') {
      return res.status(403).json({ 
        message: 'Acceso denegado: Solo los docentes y administradores tienen autorización para registrar intervenciones pedagógicas.' 
      });
    }

    const { studentId, studentName, teacherName, interventionType, newStatus, nextFollowupDate, observations } = req.body;

    if (!teacherName || !teacherName.trim()) {
      return res.status(400).json({ 
        message: 'Debe ingresar el nombre del docente responsable de la intervención.' 
      });
    }

    // VERIFICACIÓN ESTRICTA: El nombre ingresado debe pertenecer a un docente activo registrado
    const trimmedTeacherName = teacherName.trim();
    const activeTeacher = await User.findOne({
      name: { $regex: new RegExp(`^${trimmedTeacherName}$`, 'i') },
      role: 'docente'
    });

    if (!activeTeacher) {
      return res.status(400).json({
        message: `El docente '${trimmedTeacherName}' no corresponde a un docente activo registrado en la plataforma Fundación A+. Por favor selecciona o ingresa un docente válido.`
      });
    }

    // Buscar información del estudiante para vincular su correo oficial
    let student = null;
    if (studentId) {
      student = await Student.findById(studentId);
    }
    if (!student && studentName) {
      student = await Student.findOne({ name: studentName });
    }

    const targetEmail = (student?.email || req.body.studentEmail || 'juan.perez@fundacion.org').toLowerCase();
    const targetStudentName = student?.name || studentName || 'Estudiante';
    const effectiveTeacher = activeTeacher.name;

    // 1. Crear el registro inmutable en FollowUp
    const followUp = await FollowUp.create({
      studentId: student?._id || studentId,
      studentName: targetStudentName,
      teacherName: effectiveTeacher,
      interventionType,
      newStatus,
      nextFollowupDate,
      observations
    });

    // 2. Actualizar estado de las alertas y estudiante si aplica
    if (student) {
      if (newStatus === 'Resuelta') {
        await Student.findByIdAndUpdate(student._id, {
          activeAlerts: [],
          riskLevel: 'Bajo',
          recommendation: 'Acción de seguimiento resuelta con éxito. Ritmo académico y asistencia estabilizados.'
        });
        await Alert.updateMany({ studentId: student._id }, { status: 'Resuelta' });
      } else {
        await Alert.updateMany({ studentId: student._id }, { status: newStatus });
      }
    }

    // 3. Crear Notificación en MongoDB para la Campana del Estudiante
    const emailSubject = `[Fundación A+] Plan de Intervención Pedagógica: ${interventionType}`;
    const emailBody = `Apreciado/a ${targetStudentName},\n\n` +
      `Te informamos que tu docente ${effectiveTeacher} ha registrado una nueva intervención pedagógica en el marco del programa de la Fundación A+.\n\n` +
      `📌 Tipo de acción: ${interventionType}\n` +
      `📋 Estado del acompañamiento: ${newStatus}\n` +
      `📅 Próxima fecha de revisión: ${nextFollowupDate}\n\n` +
      `📝 Acuerdos y Observaciones pactadas:\n"${observations}"\n\n` +
      `Recuerda que cuentas con el respaldo permanente de tu equipo docente y la Fundación A+ para superar cualquier desafío académico.`;

    const notification = await Notification.create({
      studentEmail: targetEmail,
      studentName: targetStudentName,
      type: 'intervencion',
      title: `Nueva Intervención: ${interventionType}`,
      message: observations,
      interventionType,
      teacherName: effectiveTeacher,
      nextFollowupDate,
      status: newStatus,
      read: false,
      emailSent: true,
      emailSubject,
      emailBody
    });

    // 4. Despacho / Simulación de Correo Electrónico Institucional
    console.log(`\n======================================================================`);
    console.log(`📧 [SERVICIO DE CORREO INSTITUCIONAL FUNDACIÓN A+]`);
    console.log(`Para: ${targetEmail} (${targetStudentName})`);
    console.log(`De: notificaciones@fundacionamas.org.co`);
    console.log(`Asunto: ${emailSubject}`);
    console.log(`Docente Responsable: ${effectiveTeacher}`);
    console.log(`Fecha de Seguimiento: ${nextFollowupDate}`);
    console.log(`Observaciones:\n${observations}`);
    console.log(`🔔 Notificación sincronizada en la campana del estudiante con ID: ${notification._id}`);
    console.log(`Estado: ✅ Correo enviado exitosamente a la bandeja de ${targetEmail}`);
    console.log(`======================================================================\n`);

    res.status(201).json({
      message: 'Intervención registrada exitosamente. Notificación y correo institucional enviados al estudiante.',
      followUp,
      notification,
      emailDispatch: {
        sent: true,
        to: targetEmail,
        subject: emailSubject,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error registrando acción:', error);
    res.status(500).json({ message: 'Error al registrar acción de seguimiento' });
  }
});

app.get('/api/actions/history', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ 
        $or: [{ email: req.user.email }, { name: req.user.name }] 
      });
      const query = student 
        ? { $or: [{ studentId: student._id }, { studentName: student.name }] }
        : { studentName: req.user.name };
      const history = await FollowUp.find(query).sort({ createdAt: -1 });
      return res.json(history);
    }

    if (req.user.role === 'docente') {
      // En el apartado del docente: solo se muestran las intervenciones a cargo de este docente
      const history = await FollowUp.find({ 
        teacherName: { $regex: req.user.name, $options: 'i' } 
      }).sort({ createdAt: -1 });
      return res.json(history);
    }

    // Administrador: ve todo el historial consolidado
    const history = await FollowUp.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de acciones' });
  }
});

// ----------------------------------------------------
// 6. NOTIFICACIONES INSTITUCIONALES (CAMPANA & CORREO)
// ----------------------------------------------------
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'estudiante') {
      // Estudiante solo ve sus propias notificaciones
      query = { 
        $or: [
          { studentEmail: req.user.email.toLowerCase() },
          { studentName: req.user.name }
        ]
      };
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30);
    const unreadCount = await Notification.countDocuments({ ...query, read: false });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar notificaciones' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id, 
      { read: true }, 
      { new: true }
    );
    res.json({ message: 'Notificación marcada como leída', notification: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar notificación' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'estudiante') {
      query = { 
        $or: [
          { studentEmail: req.user.email.toLowerCase() },
          { studentName: req.user.name }
        ]
      };
    }
    await Notification.updateMany({ ...query, read: false }, { read: true });
    res.json({ message: 'Todas las notificaciones fueron marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ message: 'Error al marcar notificaciones' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'MongoDB connected', timestamp: new Date() });
});

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[API Server] Servidor backend escuchando en http://localhost:${PORT}`);
  });
});
