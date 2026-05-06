# Diagramas Técnicos del Sistema de Clínica

El sistema puede renderizar automáticamente estos diagramas. Una vez que se muestren visualmente, puedes tomarles una captura o hacer **clic derecho > Guardar imagen como...** (según las opciones de tu pantalla y visor).

## 1. Modelo Entidad-Relación de la Base de Datos

Este diagrama ilustra todas las tablas de tu base de datos y cómo se relacionan a través de sus llaves foráneas.

```mermaid
erDiagram
    ROL ||--o{ USUARIO : "tiene"
    ROL {
        int id_rol PK
        varchar nombre_rol
    }
    USUARIO {
        int id_usuario PK
        int id_rol FK
        varchar usuario
        varchar contrasena
    }

    COBERTURA ||--o{ PACIENTE : "aplica a"
    COBERTURA {
        int id_cobertura PK
        varchar nombre
        decimal porcentaje_descuento
    }
    
    PACIENTE ||--o{ FICHA : "genera"
    PACIENTE {
        int id_paciente PK
        varchar ci
        varchar nombre
        varchar apellido
        date fecha_nacimiento
        int id_cobertura FK
    }

    MEDICO ||--o{ ESPECIALIDADES_Y_MEDICOS : "pertenece a"
    ESPECIALIDAD_MEDICA ||--o{ ESPECIALIDADES_Y_MEDICOS : "agrupa a"
    ESPECIALIDAD_MEDICA {
        int id_especialidad PK
        varchar nombre
    }
    MEDICO {
        int id_medico PK
        varchar nombre
        varchar apellido
        varchar telefono
    }
    ESPECIALIDADES_Y_MEDICOS {
        int id_medico FK
        int id_especialidad FK
    }

    MEDICO ||--o{ HORARIO_MEDICO : "atiende en"
    HORARIO_MEDICO {
        int id_horario PK
        int id_medico FK
        varchar dia_semana
        time hora_inicio
        time hora_fin
        int limite_fichas
    }

    MEDICO ||--o{ AUSENCIA_MEDICO : "solicita"
    AUSENCIA_MEDICO {
        int id_ausencia PK
        int id_medico FK
        date fecha_ausencia
        varchar motivo
    }

    MEDICO ||--o{ FICHA : "atiende"
    FICHA {
        int id_ficha PK
        date fecha
        time hora
        varchar estado
        int id_paciente FK
        int id_medico FK
    }
```

---

## 2. Diagrama de Lógica y Flujo del Backend

Este diagrama refleja cómo funciona el código en el lado del servidor, mostrando el viaje de los datos desde que el usuario solicita una acción hasta que la base de datos responde.

```mermaid
flowchart TD
    %% Estilos de Nodos
    classDef client fill:#34d399,stroke:#047857,color:white,font-weight:bold
    classDef router fill:#60a5fa,stroke:#1d4ed8,color:white,font-weight:bold
    classDef auth fill:#fbbf24,stroke:#b45309,color:white,font-weight:bold
    classDef db fill:#f87171,stroke:#b91c1c,color:white,font-weight:bold
    
    %% Nodos
    User["Interfaz de Usuario \n (Frontend / Vite)"]:::client
    Server["server.js \n (Express / CORS / Express.json)"]:::router
    
    AuthRouter["/api/auth \n (Generación LocalStorage / Roles)"]:::auth
    FichasRouter["/api/fichas \n (Lógica de Disponibilidad)"]:::router
    PacientesRouter["/api/pacientes \n (Validación CI)"]:::router
    MedicosRouter["/api/medicos \n (Gestión de Ausencias y Horarios)"]:::router
    
    DBpool[("Pool de Conexiones \n MySQL (db.js)")]:::db
    
    %% Conexiones
    User -- "Peticiones HTTP \n (GET / POST / DELETE)" --> Server
    
    Server -- "/auth/*" --> AuthRouter
    Server -- "/fichas/*" --> FichasRouter
    Server -- "/pacientes/*" --> PacientesRouter
    Server -- "/medicos/*, /horarios/*" --> MedicosRouter
    
    AuthRouter -- "Queries Validadores" --> DBpool
    FichasRouter -- "Verifica Límites \n e Inserta Ficha" --> DBpool
    PacientesRouter -- "Registra Historial" --> DBpool
    MedicosRouter -- "Calcula Vacaciones \n Multifecha" --> DBpool
    
    DBpool -- "ROWS & Metadata" --> Server
    Server -- "Respuesta JSON \n { success: true }" --> User
```
