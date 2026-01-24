// Configuration and Constants for Kroki Universal Diagram Generator
// This file contains all diagram type definitions, snippets, and templates

export const KROKI_BASE_URL = 'https://kroki.io';

export const DIAGRAM_TYPES = {
    bpmn: { 
        label: 'BPMN', 
        extensions: ['.bpmn', '.xml'],
        monacoLang: 'xml',
        docs: 'https://www.omg.org/spec/BPMN/2.0/',
        hasVisualEditor: true,
        example: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Hello World">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="180" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Task_1">
        <dc:Bounds x="260" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Event_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="420" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="428" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="120" />
        <di:waypoint x="420" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>` 
    },
    mermaid: { 
        label: 'Mermaid', 
        extensions: ['.mmd', '.mermaid'],
        monacoLang: 'mermaid',
        docs: 'https://mermaid.js.org/intro/',
        hasVisualEditor: true,
        example: `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`
    },
    plantuml: { 
        label: 'PlantUML', 
        extensions: ['.puml', '.plantuml', '.wsd'],
        monacoLang: 'plantuml', 
        docs: 'https://plantuml.com/',
        example: `@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
Alice -> Bob: Another authentication Request
Alice <-- Bob: another authentication Response
@enduml`
    },
    excalidraw: { 
        label: 'Excalidraw', 
        extensions: ['.excalidraw', '.json'],
        monacoLang: 'json',
        docs: 'https://docs.excalidraw.com/',
        example: `{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://excalidraw.com",\n  "elements": [\n    {\n      "type": "rectangle",\n      "id": "rect-1",\n      "x": 100,\n      "y": 100,\n      "width": 100,\n      "height": 100,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "strokeSharpness": "sharp",\n      "seed": 1,\n      "version": 1,\n      "versionNonce": 0,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null\n    }\n  ]\n}`
    },
    c4plantuml: {
        label: 'C4 Model',
        extensions: ['.c4', '.puml'],
        monacoLang: 'plantuml',
        docs: 'https://github.com/plantuml-stdlib/C4-PlantUML',
        example: `@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

Person(personAlias, "Label", "Optional Description")
System(systemAlias, "Label", "Optional Description")

Rel(personAlias, systemAlias, "Label", "Optional Technology")
@enduml`
    },
    ditaa: { label: 'Ditaa', extensions: ['.ditaa', '.txt'], monacoLang: 'plaintext', docs: 'http://ditaa.sourceforge.net/', example: `\n/--+\n|  |\n+--+` },
    blockdiag: { label: 'BlockDiag', extensions: ['.diag'], monacoLang: 'python', docs: 'http://blockdiag.com/en/' },
    bytefield: { label: 'Bytefield', extensions: ['.bf'], monacoLang: 'clojure', docs: 'https://bytefield-svg.de/' },
    erd: { label: 'ERD', extensions: ['.erd'], monacoLang: 'plaintext', docs: 'https://github.com/BurntSushi/erd' },
    graphviz: { label: 'GraphViz', extensions: ['.dot', '.gv'], monacoLang: 'plaintext', docs: 'https://graphviz.org/documentation/' },
    nomnoml: { label: 'Nomnoml', extensions: ['.nomnoml'], monacoLang: 'plaintext', docs: 'https://nomnoml.com/' },
    pikchr: { label: 'Pikchr', extensions: ['.pikchr'], monacoLang: 'plaintext', docs: 'https://pikchr.org/home/doc/trunk/homepage.md' },
    structurizr: { label: 'Structurizr', extensions: ['.dsl', '.json'], monacoLang: 'json', docs: 'https://structurizr.com/dsl' },
    svgbob: { label: 'Svgbob', extensions: ['.bob', '.svgbob'], monacoLang: 'plaintext', docs: 'https://ivanceras.github.io/svgbob-doc/' },
    vega: { label: 'Vega', extensions: ['.vega', '.json'], monacoLang: 'json', docs: 'https://vega.github.io/vega/docs/' },
    vegalite: { label: 'Vega-Lite', extensions: ['.vl', '.json'], monacoLang: 'json', docs: 'https://vega.github.io/vega-lite/docs/' },
    wavedrom: { label: 'Wavedrom', extensions: ['.json5', '.json'], monacoLang: 'json', docs: 'https://wavedrom.com/tutorial.html' },
    wireviz: { label: 'Wireviz', extensions: ['.yaml', '.yml'], monacoLang: 'yaml', docs: 'https://github.com/formatc1702/WireViz' },
};

export const PLANTUML_SNIPPETS = {
    'Sequence Diagram': [
        { label: 'Participant', icon: 'fa-user', code: 'participant "Name" as P\n' },
        { label: 'Actor', icon: 'fa-user-circle', code: 'actor "Name" as A\n' },
        { label: 'Database', icon: 'fa-database', code: 'database "DB" as DB\n' },
        { label: 'Queue', icon: 'fa-layer-group', code: 'queue "Queue" as Q\n' },
        { label: 'Message', icon: 'fa-arrow-right', code: 'A -> B: Message\n' },
        { label: 'Response', icon: 'fa-arrow-left', code: 'B --> A: Response\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right: Note text\n' },
        { label: 'Activate', icon: 'fa-play', code: 'activate A\n' },
        { label: 'Deactivate', icon: 'fa-stop', code: 'deactivate A\n' },
        { label: 'Alt', icon: 'fa-code-branch', code: 'alt condition\n  A -> B: action\nelse other\n  A -> C: other action\nend\n' },
        { label: 'Loop', icon: 'fa-redo', code: 'loop N times\n  A -> B: action\nend\n' },
        { label: 'Group', icon: 'fa-object-group', code: 'group Label\n  A -> B: action\nend\n' },
    ],
    'Class Diagram': [
        { label: 'Class', icon: 'fa-cube', code: 'class ClassName {\n  +publicMethod()\n  -privateField\n}\n' },
        { label: 'Interface', icon: 'fa-puzzle-piece', code: 'interface InterfaceName {\n  +method()\n}\n' },
        { label: 'Enum', icon: 'fa-list', code: 'enum EnumName {\n  VALUE1\n  VALUE2\n}\n' },
        { label: 'Abstract', icon: 'fa-cube', code: 'abstract class AbstractName {\n  {abstract} +method()\n}\n' },
        { label: 'Extends', icon: 'fa-level-up-alt', code: 'ChildClass --|> ParentClass\n' },
        { label: 'Implements', icon: 'fa-check', code: 'Class ..|> Interface\n' },
        { label: 'Composition', icon: 'fa-link', code: 'ClassA *-- ClassB\n' },
        { label: 'Aggregation', icon: 'fa-link', code: 'ClassA o-- ClassB\n' },
        { label: 'Association', icon: 'fa-arrows-alt-h', code: 'ClassA -- ClassB\n' },
        { label: 'Dependency', icon: 'fa-arrow-right', code: 'ClassA ..> ClassB\n' },
        { label: 'Package', icon: 'fa-folder', code: 'package PackageName {\n  class MyClass\n}\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note "Note text" as N\n' },
    ],
    'Use Case Diagram': [
        { label: 'Actor', icon: 'fa-user', code: 'actor "User" as U\n' },
        { label: 'Use Case', icon: 'fa-ellipsis-h', code: 'usecase "Use Case" as UC\n' },
        { label: 'Rectangle', icon: 'fa-square', code: 'rectangle System {\n  usecase "UC1" as UC1\n}\n' },
        { label: 'Link', icon: 'fa-link', code: 'U --> UC\n' },
        { label: 'Include', icon: 'fa-plus', code: 'UC1 ..> UC2 : <<include>>\n' },
        { label: 'Extend', icon: 'fa-expand', code: 'UC2 ..> UC1 : <<extend>>\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right of UC : Note text\n' },
    ],
    'Activity Diagram': [
        { label: 'Start', icon: 'fa-play-circle', code: 'start\n' },
        { label: 'Stop', icon: 'fa-stop-circle', code: 'stop\n' },
        { label: 'Activity', icon: 'fa-square', code: ':Activity;\n' },
        { label: 'If/Then', icon: 'fa-code-branch', code: 'if (condition?) then (yes)\n  :action;\nelse (no)\n  :other action;\nendif\n' },
        { label: 'While', icon: 'fa-redo', code: 'while (condition?)\n  :action;\nendwhile\n' },
        { label: 'Fork', icon: 'fa-code-branch', code: 'fork\n  :action1;\nfork again\n  :action2;\nend fork\n' },
        { label: 'Partition', icon: 'fa-th-large', code: 'partition "Name" {\n  :activity;\n}\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right\n  Note text\nend note\n' },
    ],
    'State Diagram': [
        { label: 'State', icon: 'fa-circle', code: 'state "State Name" as S\n' },
        { label: 'Start', icon: 'fa-play-circle', code: '[*] --> State1\n' },
        { label: 'End', icon: 'fa-stop-circle', code: 'State1 --> [*]\n' },
        { label: 'Transition', icon: 'fa-arrow-right', code: 'State1 --> State2 : event\n' },
        { label: 'Composite', icon: 'fa-layer-group', code: 'state CompositeState {\n  [*] --> Inner\n  Inner --> [*]\n}\n' },
        { label: 'Fork', icon: 'fa-code-branch', code: 'state fork <<fork>>\n' },
        { label: 'Join', icon: 'fa-compress-arrows-alt', code: 'state join <<join>>\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right of S : Note text\n' },
    ],
    'Component Diagram': [
        { label: 'Component', icon: 'fa-cube', code: 'component "Name" as C\n' },
        { label: 'Interface', icon: 'fa-circle', code: 'interface "API" as I\n' },
        { label: 'Package', icon: 'fa-folder', code: 'package "Package" {\n  component C1\n}\n' },
        { label: 'Database', icon: 'fa-database', code: 'database "DB" as DB\n' },
        { label: 'Link', icon: 'fa-link', code: 'C1 --> C2\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right of C : Note text\n' },
    ],
    'default': [
        { label: 'Participant', icon: 'fa-user', code: 'participant "Name" as P\n' },
        { label: 'Actor', icon: 'fa-user-circle', code: 'actor "Name" as A\n' },
        { label: 'Class', icon: 'fa-cube', code: 'class ClassName {\n}\n' },
        { label: 'Arrow', icon: 'fa-arrow-right', code: 'A -> B: Message\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right: Note text\n' },
        { label: 'Title', icon: 'fa-heading', code: 'title Diagram Title\n' },
    ]
};

export const PLANTUML_TEMPLATES = [
    {
        id: 'sequence',
        label: 'Sequence Diagram',
        icon: 'fa-exchange-alt',
        description: 'Show interactions between objects over time',
        code: `@startuml
title Sequence Diagram Example

actor User as U
participant "Web App" as W
participant "API Server" as A
database "Database" as D

U -> W: Open page
activate W

W -> A: GET /api/data
activate A

A -> D: SELECT query
activate D
D --> A: Result set
deactivate D

A --> W: JSON response
deactivate A

W --> U: Render page
deactivate W

@enduml`
    },
    {
        id: 'class',
        label: 'Class Diagram',
        icon: 'fa-cubes',
        description: 'Show class structure and relationships',
        code: `@startuml
title Class Diagram Example

abstract class Animal {
  +name: String
  +age: int
  +makeSound(): void
}

class Dog {
  +breed: String
  +bark(): void
  +fetch(): void
}

class Cat {
  +color: String
  +meow(): void
  +scratch(): void
}

interface Trainable {
  +train(): void
  +obey(command: String): boolean
}

Animal <|-- Dog
Animal <|-- Cat
Trainable <|.. Dog

@enduml`
    },
    {
        id: 'usecase',
        label: 'Use Case Diagram',
        icon: 'fa-users',
        description: 'Show system functionality from user perspective',
        code: `@startuml
title Use Case Diagram Example

left to right direction

actor Customer as C
actor Admin as A

rectangle "E-Commerce System" {
  usecase "Browse Products" as UC1
  usecase "Add to Cart" as UC2
  usecase "Checkout" as UC3
  usecase "Manage Products" as UC4
  usecase "View Reports" as UC5
  usecase "Process Payment" as UC6
}

C --> UC1
C --> UC2
C --> UC3
UC3 ..> UC6 : <<include>>

A --> UC4
A --> UC5

@enduml`
    },
    {
        id: 'activity',
        label: 'Activity Diagram',
        icon: 'fa-project-diagram',
        description: 'Show workflow or process flow',
        code: `@startuml
title Activity Diagram Example

start

:Receive Order;

if (Item in stock?) then (yes)
  :Process Order;
  :Pack Items;
  
  fork
    :Generate Invoice;
  fork again
    :Prepare Shipping;
  end fork
  
  :Ship Order;
  :Send Confirmation;
else (no)
  :Notify Customer;
  :Offer Alternatives;
  
  if (Customer accepts?) then (yes)
    :Update Order;
  else (no)
    :Cancel Order;
    :Process Refund;
    stop
  endif
endif

:Update Inventory;
stop

@enduml`
    },
    {
        id: 'state',
        label: 'State Diagram',
        icon: 'fa-circle-notch',
        description: 'Show state transitions of an object',
        code: `@startuml
title State Diagram Example

[*] --> Draft

Draft --> Submitted : submit()
Draft --> Draft : edit()

Submitted --> UnderReview : assign_reviewer()
Submitted --> Draft : reject()

UnderReview --> Approved : approve()
UnderReview --> Rejected : reject()
UnderReview --> UnderReview : request_changes()

Approved --> Published : publish()
Rejected --> Draft : revise()

Published --> Archived : archive()
Published --> [*] : delete()

Archived --> [*]

@enduml`
    },
    {
        id: 'component',
        label: 'Component Diagram',
        icon: 'fa-puzzle-piece',
        description: 'Show system component architecture',
        code: `@startuml
title Component Diagram Example

package "Frontend" {
  [Web Application] as WA
  [Mobile App] as MA
}

package "Backend Services" {
  [API Gateway] as GW
  [Auth Service] as AUTH
  [User Service] as USER
  [Order Service] as ORDER
}

package "Data Layer" {
  database "PostgreSQL" as DB
  database "Redis Cache" as CACHE
  queue "Message Queue" as MQ
}

WA --> GW : HTTPS
MA --> GW : HTTPS

GW --> AUTH : validate
GW --> USER
GW --> ORDER

USER --> DB
ORDER --> DB
ORDER --> MQ

AUTH --> CACHE

@enduml`
    },
    {
        id: 'mindmap',
        label: 'Mind Map',
        icon: 'fa-brain',
        description: 'Visualize ideas and concepts',
        code: `@startmindmap
title Project Planning Mind Map

* Project
** Planning
*** Requirements
**** Functional
**** Non-functional
*** Timeline
*** Budget
** Development
*** Frontend
**** React
**** TypeScript
*** Backend
**** Node.js
**** Database
** Testing
*** Unit Tests
*** Integration Tests
*** E2E Tests
** Deployment
*** CI/CD
*** Monitoring

@endmindmap`
    },
    {
        id: 'er',
        label: 'ER Diagram',
        icon: 'fa-database',
        description: 'Show database entity relationships',
        code: `@startuml
title Entity Relationship Diagram

entity "User" as user {
  *user_id : int <<PK>>
  --
  *username : varchar(50)
  *email : varchar(100)
  password_hash : varchar(255)
  created_at : timestamp
}

entity "Order" as order {
  *order_id : int <<PK>>
  --
  *user_id : int <<FK>>
  order_date : timestamp
  total_amount : decimal
  status : varchar(20)
}

entity "Product" as product {
  *product_id : int <<PK>>
  --
  *name : varchar(100)
  description : text
  price : decimal
  stock : int
}

entity "OrderItem" as order_item {
  *item_id : int <<PK>>
  --
  *order_id : int <<FK>>
  *product_id : int <<FK>>
  quantity : int
  unit_price : decimal
}

user ||--o{ order
order ||--|{ order_item
product ||--o{ order_item

@enduml`
    },
    {
        id: 'deployment',
        label: 'Deployment Diagram',
        icon: 'fa-cloud',
        description: 'Show system deployment architecture',
        code: `@startuml
title Deployment Diagram Example

node "Load Balancer" as LB {
  [Nginx]
}

node "Web Server 1" as WS1 {
  [App Instance 1]
}

node "Web Server 2" as WS2 {
  [App Instance 2]
}

node "Database Cluster" as DBC {
  database "Primary DB" as PDB
  database "Replica DB" as RDB
}

cloud "External Services" {
  [Payment Gateway]
  [Email Service]
}

LB --> WS1
LB --> WS2
WS1 --> PDB
WS2 --> PDB
PDB --> RDB : replication
WS1 --> [Payment Gateway]
WS2 --> [Email Service]

@enduml`
    },
    {
        id: 'wbs',
        label: 'Work Breakdown',
        icon: 'fa-sitemap',
        description: 'Show project work breakdown structure',
        code: `@startwbs
title Work Breakdown Structure

* Website Redesign Project
** 1. Planning
*** 1.1 Requirements Gathering
*** 1.2 Stakeholder Interviews
*** 1.3 Project Charter
** 2. Design
*** 2.1 Wireframes
*** 2.2 Mockups
*** 2.3 Design Review
** 3. Development
*** 3.1 Frontend
**** 3.1.1 Homepage
**** 3.1.2 Product Pages
**** 3.1.3 Checkout Flow
*** 3.2 Backend
**** 3.2.1 API Development
**** 3.2.2 Database Setup
** 4. Testing
*** 4.1 QA Testing
*** 4.2 User Acceptance
** 5. Launch
*** 5.1 Deployment
*** 5.2 Monitoring

@endwbs`
    }
];
