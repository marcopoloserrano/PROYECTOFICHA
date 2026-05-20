-- =========================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: hospital_fichaje (NORMALIZADO)
-- =========================================================================

-- Desactivar llaves foráneas para permitir limpieza total
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS bloqueo_temporal;
DROP TABLE IF EXISTS pago;
DROP TABLE IF EXISTS historial_clinico;
DROP TABLE IF EXISTS ficha;
DROP TABLE IF EXISTS ausencia_medico;
DROP TABLE IF EXISTS horario;
DROP TABLE IF EXISTS medico_especialidad;
DROP TABLE IF EXISTS medico;
DROP TABLE IF EXISTS paciente;
DROP TABLE IF EXISTS especialidad;
DROP TABLE IF EXISTS cobertura;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS rol;

-- Caso especial: Por si quedaron tablas con mayúsculas en Aiven (Linux casa-sensitive)
DROP TABLE IF EXISTS Bloqueo_Temporal;
DROP TABLE IF EXISTS Pago;
DROP TABLE IF EXISTS Historial_Clinico;
DROP TABLE IF EXISTS Ficha;
DROP TABLE IF EXISTS Ausencia_Medico;
DROP TABLE IF EXISTS Horario;
DROP TABLE IF EXISTS Medico_Especialidad;
DROP TABLE IF EXISTS Medico;
DROP TABLE IF EXISTS Paciente;
DROP TABLE IF EXISTS Especialidad;
DROP TABLE IF EXISTS Cobertura;
DROP TABLE IF EXISTS Usuario;
DROP TABLE IF EXISTS Rol;

-- 1. Tabla rol
CREATE TABLE IF NOT EXISTS rol (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Tabla usuario
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    id_rol INT,
    FOREIGN KEY (id_rol) REFERENCES rol(id_rol)
);

-- 3. Tabla cobertura
CREATE TABLE IF NOT EXISTS cobertura (
    id_cobertura INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

-- 4. Tabla especialidad
CREATE TABLE IF NOT EXISTS especialidad (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 5. Tabla paciente
CREATE TABLE IF NOT EXISTS paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    ci VARCHAR(20) UNIQUE NOT NULL,
    fecha_nacimiento DATE NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    id_cobertura INT,
    FOREIGN KEY (id_cobertura) REFERENCES cobertura(id_cobertura)
);

-- 6. Tabla medico
CREATE TABLE IF NOT EXISTS medico (
    id_medico INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20)
);

-- 7. Tabla medico_especialidad
CREATE TABLE IF NOT EXISTS medico_especialidad (
    id_medico INT,
    id_especialidad INT,
    PRIMARY KEY (id_medico, id_especialidad),
    FOREIGN KEY (id_medico) REFERENCES medico(id_medico),
    FOREIGN KEY (id_especialidad) REFERENCES especialidad(id_especialidad)
);

-- 8. Tabla horario
CREATE TABLE IF NOT EXISTS horario (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT,
    dia_semana VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    limite_fichas INT DEFAULT 10,
    FOREIGN KEY (id_medico) REFERENCES medico(id_medico)
);

-- 9. Tabla ausencia_medico
CREATE TABLE IF NOT EXISTS ausencia_medico (
    id_ausencia INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT,
    fecha_ausencia DATE NOT NULL,
    motivo VARCHAR(255),
    FOREIGN KEY (id_medico) REFERENCES medico(id_medico)
);

-- 10. Tabla ficha
CREATE TABLE IF NOT EXISTS ficha (
    id_ficha INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    id_medico INT,
    id_horario INT,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    estado VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente),
    FOREIGN KEY (id_medico) REFERENCES medico(id_medico),
    FOREIGN KEY (id_horario) REFERENCES horario(id_horario),
    UNIQUE KEY unique_cita (id_medico, fecha, hora)
);

-- 11. Tabla historial_clinico
CREATE TABLE IF NOT EXISTS historial_clinico (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    diagnostico TEXT,
    tratamiento TEXT,
    fecha DATE,
    FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)
);

-- 12. Tabla pago
CREATE TABLE IF NOT EXISTS pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_ficha INT,
    monto DECIMAL(10, 2),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo VARCHAR(50),
    estado_pago VARCHAR(50) DEFAULT 'Pendiente',
    FOREIGN KEY (id_ficha) REFERENCES ficha(id_ficha)
);

-- 13. Tabla bloqueo_temporal
CREATE TABLE IF NOT EXISTS bloqueo_temporal (
    id_bloqueo INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    id_paciente INT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 2 MINUTE),
    FOREIGN KEY (id_medico) REFERENCES medico(id_medico),
    UNIQUE KEY uq_bloqueo (id_medico, fecha, hora)
);

-- =========================================================================
-- DATOS INICIALES
-- =========================================================================
INSERT IGNORE INTO rol (nombre) VALUES ('Administrador'), ('Recepcionista'), ('Paciente');
INSERT IGNORE INTO cobertura (nombre) VALUES ('SUS'), ('PARTICULAR'), ('SEGURO');

-- =========================================================================
-- TRIGGERS (NORMALIZADOS A MINÚSCULAS)
-- =========================================================================

DELIMITER $$

CREATE TRIGGER evitar_doble_ficha
BEFORE INSERT ON ficha
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM ficha
        WHERE id_medico = NEW.id_medico
        AND fecha = NEW.fecha
        AND hora = NEW.hora
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El médico ya tiene una ficha en ese horario';
    END IF;
END$$

CREATE TRIGGER evitar_ficha_en_ausencia
BEFORE INSERT ON ficha
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM ausencia_medico
        WHERE id_medico = NEW.id_medico
        AND fecha_ausencia = NEW.fecha
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: El médico está ausente ese día';
    END IF;
END$$

CREATE TRIGGER limitar_fichas
BEFORE INSERT ON ficha
FOR EACH ROW
BEGIN
    DECLARE total INT;
    DECLARE limite INT;

    SELECT COUNT(*) INTO total
    FROM ficha
    WHERE id_horario = NEW.id_horario
    AND fecha = NEW.fecha;

    SELECT limite_fichas INTO limite
    FROM horario
    WHERE id_horario = NEW.id_horario;

    IF total >= limite THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Se alcanzó el límite de fichas para este horario';
    END IF;
END$$

CREATE TRIGGER crear_pago_automatico
AFTER INSERT ON ficha
FOR EACH ROW
BEGIN
    INSERT INTO pago (id_ficha, monto, metodo, estado_pago)
    VALUES (NEW.id_ficha, 0.00, 'Pendiente', 'Pendiente');
END$$

CREATE TRIGGER historial_automatico
AFTER UPDATE ON ficha
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Atendido' AND OLD.estado <> 'Atendido' THEN
        INSERT INTO historial_clinico (id_paciente, diagnostico, tratamiento, fecha)
        VALUES (NEW.id_paciente, 'Pendiente', 'Pendiente', NEW.fecha);
    END IF;
END$$

CREATE TRIGGER evitar_doble_ficha_paciente
BEFORE INSERT ON ficha
FOR EACH ROW
BEGIN
    DECLARE v_cobertura INT;
    SELECT id_cobertura INTO v_cobertura FROM paciente WHERE id_paciente = NEW.id_paciente;
    IF v_cobertura = 1 THEN
        IF EXISTS (
            SELECT 1 FROM ficha
            WHERE id_paciente = NEW.id_paciente
            AND YEARWEEK(fecha, 1) = YEARWEEK(NEW.fecha, 1)
            AND estado NOT IN ('Cancelado', 'Anulado')
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: Al ser paciente SUS, para esa semana ya no puedes reservar una ficha';
        END IF;
    END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
