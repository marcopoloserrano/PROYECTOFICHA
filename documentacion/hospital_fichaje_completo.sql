-- =========================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: hospital_fichaje
-- (Incluye todas las correcciones, lógica de cupos y permisos médicos)
-- =========================================================================

-- 0. Crear y usar la base de datos
CREATE DATABASE IF NOT EXISTS hospital_fichaje;
USE hospital_fichaje;

-- 1. Tabla Rol
CREATE TABLE IF NOT EXISTS Rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Tabla Usuario
CREATE TABLE IF NOT EXISTS Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    id_rol INT,
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);

-- 3. Tabla Cobertura
CREATE TABLE IF NOT EXISTS Cobertura (
    id_cobertura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL -- Ej: SUS, SEGURO o PARTICULAR
);

-- 4. Tabla Especialidad
CREATE TABLE IF NOT EXISTS Especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 5. Tabla Paciente
CREATE TABLE IF NOT EXISTS Paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    fecha_nacimiento DATE NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    id_cobertura INT,
    FOREIGN KEY (id_cobertura) REFERENCES Cobertura(id_cobertura)
);

-- 6. Tabla Medico
CREATE TABLE IF NOT EXISTS Medico (
    id_medico INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20)
);

-- 7. Tabla Medico_Especialidad (Relación N:M)
CREATE TABLE IF NOT EXISTS Medico_Especialidad (
    id_medico INT,
    id_especialidad INT,
    PRIMARY KEY (id_medico, id_especialidad),
    FOREIGN KEY (id_medico) REFERENCES Medico(id_medico),
    FOREIGN KEY (id_especialidad) REFERENCES Especialidad(id_especialidad)
);

-- 8. Tabla Horario (ACTUALIZADO: Incluye Rango de Fechas y Límites de Ficha)
CREATE TABLE IF NOT EXISTS Horario (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT,
    dia_semana VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    limite_fichas INT DEFAULT 10,
    FOREIGN KEY (id_medico) REFERENCES Medico(id_medico)
);

-- 9. Tabla Ausencia_Medico (NUEVO: Maneja Permisos y Vacaciones)
CREATE TABLE IF NOT EXISTS Ausencia_Medico (
    id_ausencia INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT,
    fecha_ausencia DATE NOT NULL,
    motivo VARCHAR(255),
    FOREIGN KEY (id_medico) REFERENCES Medico(id_medico)
);

-- 10. Tabla Ficha (Citas Agendadas)
CREATE TABLE IF NOT EXISTS Ficha (
    id_ficha INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    id_medico INT,
    id_horario INT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente),
    FOREIGN KEY (id_medico) REFERENCES Medico(id_medico),
    FOREIGN KEY (id_horario) REFERENCES Horario(id_horario)
);

-- 11. Tabla Historial_Clinico
CREATE TABLE IF NOT EXISTS Historial_Clinico (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    diagnostico TEXT,
    tratamiento TEXT,
    fecha DATE,
    FOREIGN KEY (id_paciente) REFERENCES Paciente(id_paciente)
);

-- 12. Tabla Pago
CREATE TABLE IF NOT EXISTS Pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_ficha INT,
    monto DECIMAL(10, 2),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_ficha) REFERENCES Ficha(id_ficha)
);

-- =========================================================================
-- DATOS INICIALES (Semillas Base Obligatorias)
-- =========================================================================
INSERT INTO Rol (nombre) VALUES ('Administrador'), ('Recepcionista'), ('Paciente');
INSERT INTO Cobertura (nombre) VALUES ('SUS'), ('PARTICULAR'), ('SEGURO');

-- =========================================================================
-- TRIGGERS
-- =========================================================================

DELIMITER $$

-- 1. Evitar doble ficha (mismo médico, fecha y hora)
CREATE TRIGGER evitar_doble_ficha
BEFORE INSERT ON Ficha
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Ficha
        WHERE id_medico = NEW.id_medico
        AND fecha = NEW.fecha
        AND hora = NEW.hora
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El médico ya tiene una ficha en ese horario';
    END IF;
END$$

-- 2. Evitar ficha en día de ausencia
CREATE TRIGGER evitar_ficha_en_ausencia
BEFORE INSERT ON Ficha
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Ausencia_Medico
        WHERE id_medico = NEW.id_medico
        AND fecha_ausencia = NEW.fecha
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El médico está ausente ese día';
    END IF;
END$$

-- 3. Limitar cantidad de fichas por horario
CREATE TRIGGER limitar_fichas
BEFORE INSERT ON Ficha
FOR EACH ROW
BEGIN
    DECLARE total INT;
    DECLARE limite INT;

    SELECT COUNT(*) INTO total
    FROM Ficha
    WHERE id_horario = NEW.id_horario
    AND fecha = NEW.fecha;

    SELECT limite_fichas INTO limite
    FROM Horario
    WHERE id_horario = NEW.id_horario;

    IF total >= limite THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Se alcanzó el límite de fichas para este horario';
    END IF;
END$$

-- 4. Crear pago automático al registrar ficha
CREATE TRIGGER crear_pago_automatico
AFTER INSERT ON Ficha
FOR EACH ROW
BEGIN
    INSERT INTO Pago (id_ficha, monto, metodo, estado_pago)
    VALUES (NEW.id_ficha, 0.00, 'Pendiente', 'Pendiente');
END$$

-- 5. Crear historial automático cuando se atiende
CREATE TRIGGER historial_automatico
AFTER UPDATE ON Ficha
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Atendido' AND OLD.estado <> 'Atendido' THEN
        INSERT INTO Historial_Clinico (id_paciente, diagnostico, tratamiento, fecha)
        VALUES (NEW.id_paciente, 'Pendiente', 'Pendiente', NEW.fecha);
    END IF;
END$$

-- 6. Evitar que un paciente saque más de una ficha por día (NUEVO)
CREATE TRIGGER evitar_doble_ficha_paciente
BEFORE INSERT ON Ficha
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM Ficha
        WHERE id_paciente = NEW.id_paciente
        AND fecha = NEW.fecha
        AND estado IN ('Pendiente', 'Vigente')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Ya tienes una ficha reservada para este día';
    END IF;
END$$

DELIMITER ;
