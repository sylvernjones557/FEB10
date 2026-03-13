# Smart Presence System Mermaid Diagrams (without AI/MCP)

## 1. Architectural Diagram
```
flowchart TD
  FE[Frontend (React/Vite)]
  BE[Backend (FastAPI)]
  DB[(SQLite/ChromaDB)]

  FE -->|REST API| BE
  BE -->|ORM| DB
```

## 2. Database ER Diagram
```
erDiagram
  Organization ||--o{ Staff : has
  Organization ||--o{ Student : has
  Staff ||--o{ AttendanceRecord : marks
  Student ||--o{ AttendanceRecord : attends
  Group ||--o{ Student : includes
  AttendanceSession ||--o{ AttendanceRecord : contains
  Timetable ||--o{ AttendanceSession : schedules
```

## 3. Data Flow Diagram (DFD)
```
graph TD
  User --> FE
  FE --> BE
  BE --> DB
  DB --> BE
  BE --> FE
  FE --> User
```

## 4. Sequence Diagram
```
sequenceDiagram
  participant User
  participant FE as Frontend
  participant BE as Backend
  participant DB as Database

  User->>FE: Login/Request
  FE->>BE: API Call
  BE->>DB: Query/Update
  DB-->>BE: Result
  BE-->>FE: Response
  FE-->>User: Display
```

## 5. Use Case Diagram
```
flowchart TD
  User((User))
  FE[Frontend]
  BE[Backend]
  DB[(Database)]

  User --> FE
  FE --> BE
  BE --> DB
```

---
All diagrams exclude AI/MCP nodes for future enhancements.
