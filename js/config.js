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
        hasVisualEditor: true,
        example: `{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://excalidraw.com",\n  "elements": [\n    {\n      "type": "rectangle",\n      "id": "rect-1",\n      "x": 100,\n      "y": 100,\n      "width": 100,\n      "height": 100,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "strokeSharpness": "sharp",\n      "seed": 1,\n      "version": 1,\n      "versionNonce": 0,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null\n    }\n  ]\n}`
    },

    ditaa: { label: 'Ditaa', extensions: ['.ditaa', '.txt'], monacoLang: 'plaintext', docs: 'http://ditaa.sourceforge.net/', example: `\n/--+\n|  |\n+--+` },
    blockdiag: { label: 'BlockDiag', extensions: ['.diag'], monacoLang: 'python', docs: 'http://blockdiag.com/en/' },
    bytefield: { label: 'Bytefield', extensions: ['.bf'], monacoLang: 'clojure', docs: 'https://bytefield-svg.de/' },
    erd: { label: 'ERD', extensions: ['.erd'], monacoLang: 'plaintext', docs: 'https://github.com/BurntSushi/erd' },
    graphviz: { label: 'GraphViz', extensions: ['.dot', '.gv'], monacoLang: 'plaintext', docs: 'https://graphviz.org/documentation/' },
    nomnoml: { label: 'Nomnoml', extensions: ['.nomnoml'], monacoLang: 'plaintext', docs: 'https://nomnoml.com/' },
    pikchr: { label: 'Pikchr', extensions: ['.pikchr'], monacoLang: 'plaintext', docs: 'https://pikchr.org/home/doc/trunk/homepage.md' },
    pikchr: { label: 'Pikchr', extensions: ['.pikchr'], monacoLang: 'plaintext', docs: 'https://pikchr.org/home/doc/trunk/homepage.md' },
    svgbob: { label: 'Svgbob', extensions: ['.bob', '.svgbob'], monacoLang: 'plaintext', docs: 'https://ivanceras.github.io/svgbob-doc/' },
    vega: { 
        label: 'Vega', 
        extensions: ['.vega', '.json'], 
        monacoLang: 'json', 
        docs: 'https://vega.github.io/vega/docs/',
        hasVisualEditor: true
    },
    vegalite: { 
        label: 'Vega-Lite', 
        extensions: ['.vl', '.json'], 
        monacoLang: 'json', 
        docs: 'https://vega.github.io/vega-lite/docs/',
        hasVisualEditor: true,
        example: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data.",
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55},
      {"category": "C", "value": 43},
      {"category": "D", "value": 91},
      {"category": "E", "value": 81},
      {"category": "F", "value": 53}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "value", "type": "quantitative"}
  }
}`
    },
    wavedrom: { label: 'Wavedrom', extensions: ['.json5', '.json'], monacoLang: 'json', docs: 'https://wavedrom.com/tutorial.html' },
    wireviz: { label: 'Wireviz', extensions: ['.yaml', '.yml'], monacoLang: 'yaml', docs: 'https://github.com/formatc1702/WireViz' },
    c4: {
        label: 'C4 Model',
        extensions: ['.c4', '.puml', '.json'],
        monacoLang: 'plantuml', // Default, but handled dynamically in App.jsx
        docs: 'https://c4model.com/',
        hasVisualEditor: true,
        example: `@startuml
!include <C4/C4_Context>

Person(personAlias, "Label", "Optional Description")
System(systemAlias, "Label", "Optional Description")

Rel(personAlias, systemAlias, "Label", "Optional Technology")
@enduml`
    }
};

export const PLANTUML_SNIPPETS = {
    sequence: [
        { label: 'Participant', icon: 'fa-user', code: 'participant "${name}" as ${alias} ${color}\n', params: [{ name: 'name', label: 'Participant Name' }, { name: 'alias', label: 'Alias (Optional)' }, { name: 'color', label: 'Color (e.g., #Red, Green)', defaultValue: '' }] },
        { label: 'Actor', icon: 'fa-user-circle', code: 'actor "${name}" as ${alias} ${color}\n', params: [{ name: 'name', label: 'Actor Name' }, { name: 'alias', label: 'Alias (Optional)' }, { name: 'color', label: 'Color', defaultValue: '' }] },
        { label: 'Database', icon: 'fa-database', code: 'database "${name}" as ${alias} ${color}\n', params: [{ name: 'name', label: 'Database Name' }, { name: 'alias', label: 'Alias (Optional)' }, { name: 'color', label: 'Color', defaultValue: '' }] },
        { label: 'Queue', icon: 'fa-layer-group', code: 'queue "${name}" as ${alias} ${color}\n', params: [{ name: 'name', label: 'Queue Name' }, { name: 'alias', label: 'Alias (Optional)' }, { name: 'color', label: 'Color', defaultValue: '' }] },
        { label: 'Message', icon: 'fa-arrow-right', code: '${source} ${arrow} ${target}: ${message}\n', params: [{ name: 'source', label: 'Source' }, { name: 'target', label: 'Target' }, { name: 'message', label: 'Message' }, { name: 'arrow', label: 'Arrow Type', type: 'select', options: ['->', '-->', '->>', '-->>', '-\\\\', '-\\\\\\\\'], defaultValue: '->' }] },
        { label: 'Response', icon: 'fa-arrow-left', code: '${source} ${arrow} ${target}: ${message}\n', params: [{ name: 'source', label: 'Source' }, { name: 'target', label: 'Target' }, { name: 'message', label: 'Message' }, { name: 'arrow', label: 'Arrow Type', type: 'select', options: ['-->', '<--', '->', '<-'], defaultValue: '-->' }] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note ${position} ${target} ${color}: ${text}\n', params: [{ name: 'position', label: 'Position', type: 'select', options: ['right of', 'left of', 'over'] }, { name: 'target', label: 'Target Participant' }, { name: 'text', label: 'Note Text' }, { name: 'color', label: 'Color (e.g., #Yellow)', defaultValue: '' }] },
        { label: 'Activate', icon: 'fa-play', code: 'activate ${target} ${color}\n', params: [{ name: 'target', label: 'Target' }, { name: 'color', label: 'Color (Optional)', defaultValue: '' }] },
        { label: 'Deactivate', icon: 'fa-stop', code: 'deactivate ${target}\n', params: [{ name: 'target', label: 'Target' }] },
        { label: 'Alt', icon: 'fa-code-branch', code: 'alt ${condition}\n  ${action}\nelse ${other_condition}\n  ${other_action}\nend\n', params: [{name: 'condition', label: 'Condition'}, {name: 'action', label: 'Action'}, {name: 'other_condition', label: 'Else Condition'}, {name: 'other_action', label: 'Else Action'}] },
        { label: 'Loop', icon: 'fa-redo', code: 'loop ${condition}\n  ${action}\nend\n', params: [{name: 'condition', label: 'Condition'}, {name: 'action', label: 'Action'}] },
        { label: 'Group', icon: 'fa-object-group', code: 'group ${label}\n  ${action}\nend\n', params: [{name: 'label', label: 'Group Label'}, {name: 'action', label: 'Content'}] },
    ],
    class: [
        { label: 'Class', icon: 'fa-cube', code: 'class ${name} {\n  +${method}()\n  -${field}\n}\n', params: [{ name: 'name', label: 'Class Name' }, { name: 'method', label: 'Method Name' }, { name: 'field', label: 'Field Name' }] },
        { label: 'Interface', icon: 'fa-puzzle-piece', code: 'interface ${name} {\n  +${method}()\n}\n', params: [{ name: 'name', label: 'Interface Name' }, { name: 'method', label: 'Method Name' }] },
        { label: 'Enum', icon: 'fa-list', code: 'enum ${name} {\n  VALUE1\n  VALUE2\n}\n', params: [{ name: 'name', label: 'Enum Name' }] },
        { label: 'Abstract', icon: 'fa-cube', code: 'abstract class ${name} {\n  {abstract} +${method}()\n}\n', params: [{ name: 'name', label: 'Abstract Class Name' }, { name: 'method', label: 'Abstract Method' }] },
        { label: 'Extends', icon: 'fa-level-up-alt', code: '${child} --|> ${parent}\n', params: [{ name: 'child', label: 'Child Class' }, { name: 'parent', label: 'Parent Class' }] },
        { label: 'Implements', icon: 'fa-check', code: '${class} ..|> ${interface}\n', params: [{ name: 'class', label: 'Class' }, { name: 'interface', label: 'Interface' }] },
        { label: 'Composition', icon: 'fa-link', code: '${whole} *-- ${part}\n', params: [{ name: 'whole', label: 'Whole' }, { name: 'part', label: 'Part' }] },
        { label: 'Aggregation', icon: 'fa-link', code: '${whole} o-- ${part}\n', params: [{ name: 'whole', label: 'Whole' }, { name: 'part', label: 'Part' }] },
        { label: 'Association', icon: 'fa-arrows-alt-h', code: '${classA} -- ${classB}\n', params: [{ name: 'classA', label: 'Class A' }, { name: 'classB', label: 'Class B' }] },
        { label: 'Dependency', icon: 'fa-arrow-right', code: '${client} ..> ${supplier}\n', params: [{ name: 'client', label: 'Client' }, { name: 'supplier', label: 'Supplier' }] },
        { label: 'Package', icon: 'fa-folder', code: 'package ${name} {\n  class MyClass\n}\n', params: [{ name: 'name', label: 'Package Name' }] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note "${text}" as ${alias}\n', params: [{ name: 'text', label: 'Note Text' }, { name: 'alias', label: 'Alias' }] },
    ],
    usecase: [
        { label: 'Actor', icon: 'fa-user', code: 'actor "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Use Case', icon: 'fa-ellipsis-h', code: 'usecase "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Use Case Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Rectangle', icon: 'fa-square', code: 'rectangle ${name} {\n  usecase "${uc_name}" as ${uc_alias}\n}\n', params: [{ name: 'name', label: 'System Name' }, { name: 'uc_name', label: 'Inner Use Case Name' }, { name: 'uc_alias', label: 'Inner Use Case Alias' }] },
        { label: 'Link', icon: 'fa-link', code: '${actor} ${arrow} ${usecase}\n', params: [{ name: 'actor', label: 'Source (Actor)' }, { name: 'usecase', label: 'Target (Use Case)' }, { name: 'arrow', label: 'Arrow Type', type: 'select', options: ['-->', '--', '..>', '<..'], defaultValue: '-->' }] },
        { label: 'Include', icon: 'fa-plus', code: '${base} ..> ${included} : <<include>>\n', params: [{ name: 'base', label: 'Base Use Case' }, { name: 'included', label: 'Included Use Case' }] },
        { label: 'Extend', icon: 'fa-expand', code: '${extension} ..> ${base} : <<extend>>\n', params: [{ name: 'extension', label: 'Extension Use Case' }, { name: 'base', label: 'Base Use Case' }] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note ${position} of ${target} : ${text}\n', params: [{ name: 'target', label: 'Target Element' }, { name: 'text', label: 'Note Text' }, { name: 'position', label: 'Position', type: 'select', options: ['right', 'left', 'top', 'bottom'] }] },
    ],
    activity: [
        { label: 'Start', icon: 'fa-play-circle', code: 'start\n' },
        { label: 'Stop', icon: 'fa-stop-circle', code: 'stop\n' },
        { label: 'Activity', icon: 'fa-square', code: ':${name};\n', params: [{ name: 'name', label: 'Activity Name' }] },
        { label: 'If/Then', icon: 'fa-code-branch', code: 'if (${condition}?) then (yes)\n  :${action_yes};\nelse (no)\n  :${action_no};\nendif\n', params: [{name: 'condition', label: 'Condition'}, {name: 'action_yes', label: 'Yes Action'}, {name: 'action_no', label: 'No Action'}] },
        { label: 'While', icon: 'fa-redo', code: 'while (${condition}?)\n  :${action};\nendwhile\n', params: [{name: 'condition', label: 'Condition'}, {name: 'action', label: 'Loop Action'}] },
        { label: 'Fork', icon: 'fa-code-branch', code: 'fork\n  :${action1};\nfork again\n  :${action2};\nend fork\n', params: [{name: 'action1', label: 'Path 1 Action'}, {name: 'action2', label: 'Path 2 Action'}] },
        { label: 'Partition', icon: 'fa-th-large', code: 'partition "${name}" {\n  :${activity};\n}\n', params: [{name: 'name', label: 'Partition Name'}, {name: 'activity', label: 'Inner Activity'}] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note ${position}\n  ${text}\nend note\n', params: [{name: 'text', label: 'Note Text'}, {name: 'position', label: 'Position', type: 'select', options: ['right', 'left']}] },
    ],
    state: [
        { label: 'State', icon: 'fa-circle', code: 'state "${name}" as ${alias}\n', params: [{ name: 'name', label: 'State Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Start', icon: 'fa-play-circle', code: '[*] --> ${target}\n', params: [{ name: 'target', label: 'Initial State' }] },
        { label: 'End', icon: 'fa-stop-circle', code: '${source} --> [*]\n', params: [{ name: 'source', label: 'Final State' }] },
        { label: 'Transition', icon: 'fa-arrow-right', code: '${source} --> ${target} : ${event}\n', params: [{ name: 'source', label: 'Source' }, { name: 'target', label: 'Target' }, { name: 'event', label: 'Event/Condition' }] },
        { label: 'Composite', icon: 'fa-layer-group', code: 'state ${name} {\n  [*] --> ${inner}\n  ${inner} --> [*]\n}\n', params: [{name: 'name', label: 'State Name'}, {name: 'inner', label: 'Inner State'}] },
        { label: 'Fork', icon: 'fa-code-branch', code: 'state ${name} <<fork>>\n', params: [{ name: 'name', label: 'Fork Name' }] },
        { label: 'Join', icon: 'fa-compress-arrows-alt', code: 'state ${name} <<join>>\n', params: [{ name: 'name', label: 'Join Name' }] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note ${position} of ${target} : ${text}\n', params: [{name: 'target', label: 'Target State'}, {name: 'text', label: 'Note Text'}, {name: 'position', label: 'Position', type: 'select', options: ['right', 'left', 'top', 'bottom']}] },
    ],
    component: [
        { label: 'Component', icon: 'fa-cube', code: 'component "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Component Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Interface', icon: 'fa-circle', code: 'interface "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Interface Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Package', icon: 'fa-folder', code: 'package "${name}" {\n  component ${component}\n}\n' },
        { label: 'Database', icon: 'fa-database', code: 'database "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Database Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Link', icon: 'fa-link', code: '${source} --> ${target}\n', params: [{ name: 'source', label: 'Source' }, { name: 'target', label: 'Target' }] },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right of ${target} : ${text}\n' },
    ],
    deployment: [
        { label: 'Node', icon: 'fa-server', code: 'node "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Node Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Cloud', icon: 'fa-cloud', code: 'cloud "${name}" as ${alias}\n', params: [{ name: 'name', label: 'Cloud Name' }, { name: 'alias', label: 'Alias' }] },
        { label: 'Database', icon: 'fa-database', code: 'database "${name}" as ${alias}\n' },
        { label: 'Artifact', icon: 'fa-file-code', code: 'artifact "${name}" as ${alias}\n' },
        { label: 'Folder', icon: 'fa-folder', code: 'folder "${name}" as ${alias}\n' },
        { label: 'Link', icon: 'fa-link', code: '${source} --> ${target}\n' },
    ],
    timing: [
        { label: 'Clock', icon: 'fa-clock', code: 'clock "${name}" as ${alias} with period ${period}\n' },
        { label: 'Binary', icon: 'fa-toggle-on', code: 'binary "${name}" as ${alias}\n' },
        { label: 'Robust', icon: 'fa-wave-square', code: 'robust "${name}" as ${alias}\n' },
        { label: 'Concise', icon: 'fa-compress', code: 'concise "${name}" as ${alias}\n' },
        { label: 'Event', icon: 'fa-bolt', code: '@${time}\n' },
        { label: 'Change', icon: 'fa-exchange-alt', code: '@${time} as :${state}\n' },
    ],
    network: [
        { label: 'Network', icon: 'fa-network-wired', code: 'nwdiag {\n  network ${name} {\n      address = "${address}"\n      ${node} [address = "${node_address}"];\n  }\n}\n' },
        { label: 'Server', icon: 'fa-server', code: '${name} [address = "${address}"];\n' },
        { label: 'Group', icon: 'fa-object-group', code: 'group {\n  ${nodes};\n}\n' },
    ],
    gantt: [
        { label: 'Task', icon: 'fa-tasks', code: '[${name}] lasts ${days} days\n', params: [{ name: 'name', label: 'Task Name' }, { name: 'days', label: 'Duration (days)' }] },
        { label: 'Start', icon: 'fa-play', code: '[${name}] starts ${date}\n' },
        { label: 'End', icon: 'fa-stop', code: '[${name}] ends ${date}\n' },
        { label: 'Milestone', icon: 'fa-flag', code: '[${name}] happens ${date}\n' },
        { label: 'Dependency', icon: 'fa-arrow-right', code: '[${task2}] starts at [${task1}]\'s end\n' },
    ],
    mindmap: [
        { label: 'Root', icon: 'fa-circle', code: '* ${text}\n', params: [{ name: 'text', label: 'Root Text' }] },
        { label: 'Level 1', icon: 'fa-circle-notch', code: '** ${text}\n', params: [{ name: 'text', label: 'Node Text' }] },
        { label: 'Level 2', icon: 'fa-dot-circle', code: '*** ${text}\n', params: [{ name: 'text', label: 'Node Text' }] },
        { label: 'Boxless', icon: 'fa-font', code: '**_ ${text}\n', params: [{ name: 'text', label: 'Node Text' }] },
    ],
    wbs: [
        { label: 'Root', icon: 'fa-sitemap', code: '* ${text}\n', params: [{ name: 'text', label: 'Project Name' }] },
        { label: 'Branch', icon: 'fa-code-branch', code: '** ${text}\n', params: [{ name: 'text', label: 'Phase Name' }] },
        { label: 'Leaf', icon: 'fa-leaf', code: '*** ${text}\n', params: [{ name: 'text', label: 'Task Name' }] },
        { label: 'Boxless', icon: 'fa-font', code: '**_ ${text}\n', params: [{ name: 'text', label: 'Task Name' }] },
    ],
    json: [
        { label: 'String', icon: 'fa-font', code: '"${key}": "${value}"\n' },
        { label: 'Number', icon: 'fa-calculator', code: '"${key}": ${value}\n' },
        { label: 'Object', icon: 'fa-cube', code: '"${key}": {\n  "${innerKey}": "${innerValue}"\n}\n' },
        { label: 'Array', icon: 'fa-list', code: '"${key}": [\n  "${item1}",\n  "${item2}"\n]\n' },
    ],
    yaml: [
        { label: 'Key-Value', icon: 'fa-font', code: '${key}: ${value}\n' },
        { label: 'List', icon: 'fa-list', code: '- ${item1}\n- ${item2}\n' },
        { label: 'Object', icon: 'fa-cube', code: '${key}:\n  ${innerKey}: ${innerValue}\n' },
    ],
    common: [
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right: ${text}\n', params: [{ name: 'text', label: 'Note Text' }] },
        { label: 'Title', icon: 'fa-heading', code: 'title ${text}\n', params: [{ name: 'text', label: 'Title' }] },
    ],
    fallback: [
        { label: 'Participant', icon: 'fa-user', code: 'participant "${name}" as ${alias}\n' },
        { label: 'Actor', icon: 'fa-user-circle', code: 'actor "${name}" as ${alias}\n' },
        { label: 'Class', icon: 'fa-cube', code: 'class ${name} {\n}\n' },
        { label: 'Arrow', icon: 'fa-arrow-right', code: '${source} -> ${target}: ${message}\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right: ${text}\n' },
        { label: 'Title', icon: 'fa-heading', code: 'title ${text}\n' },
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
    },
    {
        id: 'json',
        label: 'JSON Data',
        icon: 'fa-code',
        description: 'Visualize JSON data',
        code: `@startjson
{
  "firstName": "John",
  "lastName": "Smith",
  "isAlive": true,
  "age": 27,
  "address": {
    "streetAddress": "21 2nd Street",
    "city": "New York",
    "state": "NY",
    "postalCode": "10021-3100"
  },
  "phoneNumbers": [
    {
      "type": "home",
      "number": "212 555-1234"
    },
    {
      "type": "office",
      "number": "646 555-4567"
    }
  ],
  "children": [],
  "spouse": null
}
@endjson`
    },
    {
        id: 'yaml',
        label: 'YAML Data',
        icon: 'fa-file-code',
        description: 'Visualize YAML data',
        code: `@startyaml
doi: 10.1038/nmat3283
key:
  - OA
  - transparent
  - device
author:
  -
    name: G. W. C.
    affiliation: University of Groningen
  -
    name: H. G.
    affiliation: University of Groningen
@endyaml`
    },
    {
        id: 'timing',
        label: 'Timing Diagram',
        icon: 'fa-clock',
        description: 'Show timing and state changes',
        code: `@startuml
robust "DNS Resolver" as DNS
robust "Web Browser" as WB
concise "User" as U

@0
U is Idle
WB is Idle
DNS is Idle

@+100
U -> WB : URL
U is Waiting
WB is Processing

@+200
WB is Waiting
WB -> DNS@+50 : Resolve URL

@+100
DNS is Processing

@+300
DNS is Idle
DNS -> WB@+50 : Resolved Address

@+100
WB is Idle
WB -> U : Page content
U is Idle
@enduml`
    },
    {
        id: 'gantt',
        label: 'Gantt Chart',
        icon: 'fa-tasks',
        description: 'Project schedule',
        code: `@startgantt
[Prototype design] lasts 13 days and is colored in Lavender/LightBlue
[Test prototype] lasts 9 days and is colored in Coral/Green and starts 3 days after [Prototype design]'s end
[Write tests] lasts 5 days and ends at [Prototype design]'s end
[Hire tests writers] lasts 6 days and ends at [Write tests]'s start
[Init and write tests report] is colored in Coral/Green
[Init and write tests report] starts 1 day after [Test prototype]'s start and ends at [Test prototype]'s end
@endgantt`
    }
];

export const MERMAID_SNIPPETS = {
    flowchart: [
        { label: 'Start/End', icon: 'fa-circle', code: '([Start/End])' },
        { label: 'Process', icon: 'fa-square', code: '[Process]' },
        { label: 'Decision', icon: 'fa-draw-polygon', code: '{?}' },
        { label: 'Subroutine', icon: 'fa-columns', code: '[[Subroutine]]' },
        { label: 'Database', icon: 'fa-database', code: '[(Database)]' },
        { label: 'Circle', icon: 'fa-circle', code: '((Circle))' },
        { label: 'Link', icon: 'fa-arrow-right', code: '--> ' },
        { label: 'Label Link', icon: 'fa-tag', code: '-- Text -->' },
        { label: 'Dotted', icon: 'fa-ellipsis-h', code: '-.->' },
        { label: 'Thick', icon: 'fa-minus', code: '==>' },
    ],
    sequence: [
        { label: 'Participant', icon: 'fa-user', code: 'participant Alice\n' },
        { label: 'Actor', icon: 'fa-user-circle', code: 'actor Bob\n' },
        { label: 'Message', icon: 'fa-arrow-right', code: 'Alice->>Bob: Hello\n' },
        { label: 'Response', icon: 'fa-arrow-left', code: 'Bob-->>Alice: Hi!\n' },
        { label: 'Loop', icon: 'fa-redo', code: 'loop Every minute\n    Bob-->>Alice: Ping\nend\n' },
        { label: 'Alt', icon: 'fa-code-branch', code: 'alt is sick\n    Bob->>Alice: Not coming\nelse is well\n    Bob->>Alice: Coming\nend\n' },
        { label: 'Opt', icon: 'fa-question-circle', code: 'opt Extra info\n    Bob->>Alice: ...\nend\n' },
        { label: 'Note', icon: 'fa-sticky-note', code: 'note right of Alice: Thinking...\n' },
    ],
    class: [
        { label: 'Class', icon: 'fa-cube', code: 'class BankAccount{\n    +String owner\n    +BigDecimal balance\n    +deposit(amount)\n    +withdrawal(amount)\n}\n' },
        { label: 'Interface', icon: 'fa-puzzle-piece', code: 'class ICard{\n    <<interface>>\n    +process()\n}\n' },
        { label: 'Inheritance', icon: 'fa-arrow-up', code: 'Duck <|-- WhiteDuck\n' },
        { label: 'Composition', icon: 'fa-link', code: 'Wheel *-- Car\n' },
        { label: 'Aggregation', icon: 'fa-link', code: 'Student "1" o-- "many" Course\n' },
        { label: 'Association', icon: 'fa-code-branch', code: 'Student "1" --> "many" Course\n' },
    ],
    state: [
        { label: 'Start', icon: 'fa-circle', code: '[*] --> ' },
        { label: 'State', icon: 'fa-square', code: 'State1' },
        { label: 'Transition', icon: 'fa-arrow-right', code: 'State1 --> State2 : event\n' },
        { label: 'Composite', icon: 'fa-layer-group', code: 'state Composite {\n    [*];\n    --\n    [*];\n}\n' },
        { label: 'Decision', icon: 'fa-code-branch', code: 'state if_state <<choice>>\n' },
        { label: 'Fork', icon: 'fa-code-branch', code: 'state fork_state <<fork>>\n' },
        { label: 'Join', icon: 'fa-compress-arrows-alt', code: 'state join_state <<join>>\n' },
    ],
    er: [
        { label: 'Entity', icon: 'fa-table', code: 'CUSTOMER {\n    string name\n    string custNumber\n    string sector\n}\n' },
        { label: 'One to One', icon: 'fa-arrows-alt-h', code: 'CAR ||--|| NAMED-DRIVER : allows\n' },
        { label: 'One to Many', icon: 'fa-arrows-alt-h', code: 'CUSTOMER ||--|{ ORDER : places\n' },
        { label: 'Many to Many', icon: 'fa-arrows-alt-h', code: 'ORDER }|..|{ ITEM : contains\n' },
    ],
    gantt: [
        { label: 'Section', icon: 'fa-layer-group', code: 'section Section\n' },
        { label: 'Task', icon: 'fa-tasks', code: 'A task :a1, 2014-01-01, 30d\n' },
        { label: 'Critical', icon: 'fa-exclamation-circle', code: 'crit :crit1, 2014-01-05, 3d\n' },
        { label: 'Milestone', icon: 'fa-flag', code: 'Milestone :milestone, m1, 2014-01-25, 0d\n' },
    ],
    pie: [
        { label: 'Data', icon: 'fa-chart-pie', code: '"Category" : 100\n' },
    ],
    gitGraph: [
        { label: 'Commit', icon: 'fa-code-branch', code: 'commit\n' },
        { label: 'Branch', icon: 'fa-code-branch', code: 'branch newbranch\n' },
        { label: 'Checkout', icon: 'fa-code-branch', code: 'checkout newbranch\n' },
        { label: 'Merge', icon: 'fa-code-branch', code: 'merge newbranch\n' },
        { label: 'Tag', icon: 'fa-tag', code: 'commit tag: "v1.0"\n' },
    ],
    mindmap: [
        { label: 'Root', icon: 'fa-circle', code: 'root((mindmap))\n' },
        { label: 'Square', icon: 'fa-square', code: '[Text]\n' },
        { label: 'Round', icon: 'fa-circle', code: '(Text)\n' },
        { label: 'Bang', icon: 'fa-bomb', code: '))Text((\n' },
        { label: 'Cloud', icon: 'fa-cloud', code: ')Text(\n' },
        { label: 'Circle', icon: 'fa-circle', code: '((Text))\n' },
        { label: 'Hexagon', icon: 'fa-draw-polygon', code: '{{Text}}\n' },
    ],
    journey: [
        { label: 'Title', icon: 'fa-heading', code: 'title My Journey\n' },
        { label: 'Section', icon: 'fa-layer-group', code: 'section Go to work\n' },
        { label: 'Task', icon: 'fa-tasks', code: 'Make tea: 5: Me\n' },
    ],
    timeline: [
        { label: 'Title', icon: 'fa-heading', code: 'title Timeline\n' },
        { label: 'Section', icon: 'fa-layer-group', code: 'section 2023\n' },
        { label: 'Event', icon: 'fa-calendar-day', code: 'Event 1 : Description\n' },
    ],
    quadrantChart: [
        { label: 'Axis', icon: 'fa-arrows-alt', code: 'x-axis Low --> High\ny-axis Low --> High\n' },
        { label: 'Quadrant', icon: 'fa-th-large', code: 'quadrant-1 Plan\nquadrant-2 Do\nquadrant-3 Check\nquadrant-4 Act\n' },
        { label: 'Point', icon: 'fa-dot-circle', code: 'Point A: [0.3, 0.6]\n' },
    ],
    requirementDiagram: [
        { label: 'Requirement', icon: 'fa-clipboard-check', code: 'requirement test_req {\n  id: 1\n  text: the test requirement\n  risk: high\n  verifymethod: test\n}\n' },
        { label: 'Element', icon: 'fa-cube', code: 'element test_entity {\n  type: simulation\n}\n' },
        { label: 'Link', icon: 'fa-link', code: 'test_entity - satisfies -> test_req\n' },
    ],
    c4: [
        { label: 'Person', icon: 'fa-user', code: 'Person(user, "User", "Description")\n' },
        { label: 'System', icon: 'fa-server', code: 'System(system, "System", "Description")\n' },
        { label: 'Rel', icon: 'fa-arrow-right', code: 'Rel(user, system, "Uses")\n' },
        { label: 'Container', icon: 'fa-box', code: 'Container(container, "Container", "Tech", "Desc")\n' },
        { label: 'Component', icon: 'fa-cogs', code: 'Component(comp, "Component", "Tech", "Desc")\n' },
    ],
    sankey: [
        { label: 'Link', icon: 'fa-arrow-right', code: 'Source,Target,Value\n' },
    ],
    xyChart: [
        { label: 'Title', icon: 'fa-heading', code: 'title "XY Chart"\n' },
        { label: 'X-Axis', icon: 'fa-arrows-alt-h', code: 'x-axis [jan, feb, mar]\n' },
        { label: 'Y-Axis', icon: 'fa-arrows-alt-v', code: 'y-axis "Revenue" 0 --> 100\n' },
        { label: 'Bar', icon: 'fa-chart-bar', code: 'bar [10, 20, 30]\n' },
        { label: 'Line', icon: 'fa-chart-line', code: 'line [15, 25, 35]\n' },
    ],
    block: [
        { label: 'Block', icon: 'fa-cube', code: 'block:id\n' },
        { label: 'Column', icon: 'fa-columns', code: 'columns 3\n' },
        { label: 'Space', icon: 'fa-arrows-alt-h', code: 'space\n' },
        { label: 'Arrow', icon: 'fa-arrow-right', code: 'block1 --> block2\n' },
    ],
    packet: [
        { label: 'Packet', icon: 'fa-box-open', code: 'packet-beta\n' },
        { label: 'Bit 0-15', icon: 'fa-ruler-horizontal', code: '0-15: "Source Port"\n' },
        { label: 'Bit 16-31', icon: 'fa-ruler-horizontal', code: '16-31: "Destination Port"\n' },
    ],
    kanban: [
        { label: 'Todo', icon: 'fa-clipboard-list', code: 'todo\n' },
        { label: 'Done', icon: 'fa-check-square', code: 'done\n' },
        { label: 'Item', icon: 'fa-sticky-note', code: '[Item Name]\n' },
    ],
    architecture: [
        { label: 'Service', icon: 'fa-server', code: 'service "Name"(icon)\n' },
        { label: 'Group', icon: 'fa-object-group', code: 'group "Name" {\n}\n' },
        { label: 'Junction', icon: 'fa-circle', code: 'junction "Name"\n' },
        { label: 'Link', icon: 'fa-arrow-right', code: 'service1:R -- L:service2\n' },
    ],
    common: [
         { label: 'Link', icon: 'fa-arrow-right', code: '--> ' },
         { label: 'Note', icon: 'fa-sticky-note', code: 'Note right of Node: Text\n' },
    ]
};

export const MERMAID_TEMPLATES = [
    {
        id: 'flowchart',
        label: 'Flowchart',
        icon: 'fa-project-diagram',
        description: 'Show workflow or process',
        code: `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B`
    },
    {
        id: 'sequence',
        label: 'Sequence Diagram',
        icon: 'fa-exchange-alt',
        description: 'Show interactions over time',
        code: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: I am good thanks!
    Bob->>John: How about you John?
    John-->>Bob: I am good too!
    Alice->>John: Hello John!
    John-->>Alice: Hi Alice!`
    },
    {
        id: 'class',
        label: 'Class Diagram',
        icon: 'fa-cubes',
        description: 'Show class structure',
        code: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
    class Zebra{
        +bool is_wild
        +run()
    }`
    },
    {
        id: 'state',
        label: 'State Diagram',
        icon: 'fa-circle-notch',
        description: 'Show state machine',
        code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`
    },
    {
        id: 'er',
        label: 'ER Diagram',
        icon: 'fa-database',
        description: 'Show entity relationships',
        code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses`
    },
    {
        id: 'gantt',
        label: 'Gantt Chart',
        icon: 'fa-tasks',
        description: 'Show project schedule',
        code: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2014-01-01, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2014-01-12  , 12d
    another task      : 24d`
    },
    {
        id: 'pie',
        label: 'Pie Chart',
        icon: 'fa-chart-pie',
        description: 'Show data distribution',
        code: `pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`
    },
    {
        id: 'mindmap',
        label: 'Mind Map',
        icon: 'fa-brain',
        description: 'Visualize ideas',
        code: `mindmap
  root((mindmap))
    Origins
      Long history
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation
        Uses
            Creative techniques
            Strategic planning
            Argument mapping`
    },
    {
        id: 'git',
        label: 'Git Graph',
        icon: 'fa-code-branch',
        description: 'Show git history',
        code: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`
    },
    {
        id: 'journey',
        label: 'User Journey',
        icon: 'fa-map-signs',
        description: 'Describe user workflows',
        code: `journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me`
    },
    {
        id: 'timeline',
        label: 'Timeline',
        icon: 'fa-stream',
        description: 'Show events over time',
        code: `timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook : Google
    2005 : Youtube
    2006 : Twitter`
    },
    {
        id: 'quadrant',
        label: 'Quadrant Chart',
        icon: 'fa-th-large',
        description: 'Visualize data in quadrants',
        code: `quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]`
    },
    {
        id: 'requirement',
        label: 'Requirement Diagram',
        icon: 'fa-clipboard-check',
        description: 'Show requirements and traces',
        code: `requirementDiagram
    requirement test_req {
    id: 1
    text: the test requirement
    risk: high
    verifymethod: test
    }
    element test_entity {
    type: simulation
    }
    test_entity - satisfies -> test_req`
    },
    {
        id: 'c4',
        label: 'C4 Diagram',
        icon: 'fa-layer-group',
        description: 'Context, Container, Component diagrams',
        code: `C4Context
    title System Context diagram for Internet Banking System
    Person(customerA, "Banking Customer A", "A customer of the bank, with personal bank accounts.")
    System(SystemAA, "Internet Banking System", "Allows customers to view information about their bank accounts, and make payments.")
    
    Rel(customerA, SystemAA, "Uses")`
    }
];

export const BPMN_TEMPLATES = [
    {
        id: 'simple-process',
        label: 'Simple Process',
        icon: 'fa-project-diagram',
        description: 'Basic start, task, and end process',
        code: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Perform Action">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="End">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
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
      <bpmndi:BPMNShape id="Activity_1" bpmnElement="Task_1">
        <dc:Bounds x="260" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="420" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="428" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="209" y="120" />
        <di:waypoint x="260" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="360" y="120" />
        <di:waypoint x="420" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    },
    {
        id: 'approval',
        label: 'Approval Flow',
        icon: 'fa-check-double',
        description: 'Process with approval gateway',
        code: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Request Received">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Review Request">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1" name="Approve?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Yes</bpmn:outgoing>
      <bpmn:outgoing>Flow_No</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="Task_2" name="Process Request">
      <bpmn:incoming>Flow_Yes</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_3" name="Reject Request">
      <bpmn:incoming>Flow_No</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_Approved" name="Approved">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Rejected" name="Rejected">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_Yes" name="Yes" sourceRef="Gateway_1" targetRef="Task_2" />
    <bpmn:sequenceFlow id="Flow_No" name="No" sourceRef="Gateway_1" targetRef="Task_3" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="End_Approved" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_3" targetRef="End_Rejected" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="131" y="145" width="89" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true">
        <dc:Bounds x="395" y="95" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="396" y="71" width="47" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_2" bpmnElement="Task_2">
        <dc:Bounds x="500" y="95" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_3" bpmnElement="Task_3">
        <dc:Bounds x="500" y="210" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_App" bpmnElement="End_Approved">
        <dc:Bounds x="662" y="117" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="659" y="160" width="48" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_Rej" bpmnElement="End_Rejected">
        <dc:Bounds x="662" y="232" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="660" y="275" width="44" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="395" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Y_di" bpmnElement="Flow_Yes">
        <di:waypoint x="445" y="120" />
        <di:waypoint x="500" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_N_di" bpmnElement="Flow_No">
        <di:waypoint x="420" y="145" />
        <di:waypoint x="420" y="250" />
        <di:waypoint x="500" y="250" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="600" y="135" />
        <di:waypoint x="662" y="135" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="600" y="250" />
        <di:waypoint x="662" y="250" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
    }
];

export const EXCALIDRAW_TEMPLATES = [
    {
        id: 'blank',
        label: 'Blank Canvas',
        icon: 'fa-square',
        description: 'Empty Excalidraw canvas',
        code: `{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://excalidraw.com",\n  "elements": [],\n  "appState": {\n    "viewBackgroundColor": "#ffffff",\n    "gridSize": null\n  },\n  "files": {}\n}`
    },
    {
        id: 'flowchart',
        label: 'Simple Flow',
        icon: 'fa-project-diagram',
        description: 'Basic boxes and arrows',
        code: `{\n  "type": "excalidraw",\n  "version": 2,\n  "source": "https://excalidraw.com",\n  "elements": [\n    {\n      "id": "node1",\n      "type": "rectangle",\n      "x": 100,\n      "y": 100,\n      "width": 100,\n      "height": 50,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "roundness": null,\n      "seed": 1,\n      "version": 1,\n      "versionNonce": 0,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null,\n      "locked": false,\n      "customData": null\n    },\n    {\n      "id": "node2",\n      "type": "rectangle",\n      "x": 300,\n      "y": 100,\n      "width": 100,\n      "height": 50,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "roundness": null,\n      "seed": 2,\n      "version": 1,\n      "versionNonce": 0,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null,\n      "locked": false,\n      "customData": null\n    },\n    {\n      "id": "arrow1",\n      "type": "arrow",\n      "x": 200,\n      "y": 125,\n      "width": 100,\n      "height": 0,\n      "angle": 0,\n      "strokeColor": "#000000",\n      "backgroundColor": "transparent",\n      "fillStyle": "hachure",\n      "strokeWidth": 1,\n      "strokeStyle": "solid",\n      "roughness": 1,\n      "opacity": 100,\n      "groupIds": [],\n      "roundness": null,\n      "seed": 3,\n      "version": 1,\n      "versionNonce": 0,\n      "isDeleted": false,\n      "boundElements": null,\n      "updated": 1,\n      "link": null,\n      "locked": false,\n      "customData": null,\n      "points": [[0, 0], [100, 0]]\n    }\n  ],\n  "appState": {\n    "viewBackgroundColor": "#ffffff",\n    "gridSize": null\n  },\n  "files": {}\n}`
    }
];



export const VEGALITE_TEMPLATES = [
    {
        id: 'bar',
        label: 'Bar Chart',
        icon: 'fa-chart-bar',
        description: 'Simple bar chart',
        code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55},
      {"category": "C", "value": 43},
      {"category": "D", "value": 91},
      {"category": "E", "value": 81},
      {"category": "F", "value": 53},
      {"category": "G", "value": 19},
      {"category": "H", "value": 87}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "value", "type": "quantitative"}
  }
}`
    },
    {
        id: 'line',
        label: 'Line Chart',
        icon: 'fa-chart-line',
        description: 'Time series line chart',
        code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "values": [
      {"date": "2023-01-01", "value": 10},
      {"date": "2023-01-02", "value": 15},
      {"date": "2023-01-03", "value": 12},
      {"date": "2023-01-04", "value": 20},
      {"date": "2023-01-05", "value": 25},
      {"date": "2023-01-06", "value": 22},
      {"date": "2023-01-07", "value": 30}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "date", "type": "temporal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}`
    },
    {
        id: 'scatter',
        label: 'Scatter Plot',
        icon: 'fa-braille',
        description: 'Correlation scatter plot',
        code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "url": "https://vega.github.io/editor/data/cars.json"
  },
  "mark": "point",
  "encoding": {
    "x": {"field": "Horsepower", "type": "quantitative"},
    "y": {"field": "Miles_per_Gallon", "type": "quantitative"},
    "color": {"field": "Origin", "type": "nominal"}
  }
}`
    },
    {
        id: 'area',
        label: 'Area Chart',
        icon: 'fa-chart-area',
        description: 'Stacked area chart',
        code: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {
    "url": "https://vega.github.io/editor/data/unemployment-across-industries.json"
  },
  "mark": "area",
  "encoding": {
    "x": {
      "timeUnit": "yearmonth", "field": "date",
      "axis": {"format": "%Y"}
    },
    "y": {
      "aggregate": "sum", "field": "count"
    },
    "color": {
      "field": "series",
      "scale": {"scheme": "category20b"}
    }
  }
}`
    }
];

export const C4_VISUAL_TEMPLATES = [
    {
        id: 'basic',
        label: 'Basic Model',
        icon: 'fa-layer-group',
        description: 'Simple C4 model with User and System',
        code: `{
  "nodes": [
    {
      "id": "1",
      "type": "person",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Customer", "description": "A user of the system", "type": "person" }
    },
    {
      "id": "2",
      "type": "system",
      "position": { "x": 250, "y": 250 },
      "data": { "label": "Web App", "description": "A great web application", "type": "system" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "1", "target": "2", "label": "uses", "type": "floating" }
  ]
}`
    },
    {
        id: 'ecommerce',
        label: 'E-Commerce',
        icon: 'fa-shopping-cart',
        description: 'E-Commerce system architecture',
        code: `{
  "nodes": [
    {
      "id": "customer",
      "type": "person",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Customer", "type": "person" }
    },
    {
      "id": "ecommerce",
      "type": "system",
      "position": { "x": 250, "y": 200 },
      "data": { "label": "E-Commerce System", "type": "system" }
    },
    {
      "id": "web",
      "type": "container",
      "position": { "x": 100, "y": 200 },
      "data": { "label": "Web App", "type": "container", "parentId": "ecommerce" },
      "parentNode": "ecommerce",
      "extent": "parent"
    },
    {
      "id": "api",
      "type": "container",
      "position": { "x": 300, "y": 200 },
      "data": { "label": "API Service", "type": "container", "parentId": "ecommerce" },
      "parentNode": "ecommerce",
      "extent": "parent"
    },
    {
      "id": "db",
      "type": "database",
      "position": { "x": 250, "y": 500 },
      "data": { "label": "Database", "type": "database" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "customer", "target": "web", "label": "visits" },
    { "id": "e2", "source": "web", "target": "api", "label": "requests" },
    { "id": "e3", "source": "api", "target": "db", "label": "queries" }
  ]
}`
    }
];

export const VEGA_TEMPLATES = [
    {
        id: 'bar-vega',
        label: 'Bar Chart (Vega)',
        icon: 'fa-chart-bar',
        description: 'Standard bar chart in Vega',
        code: `{
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "width": 400,
  "height": 200,
  "padding": 5,

  "data": [
    {
      "name": "table",
      "values": [
        {"category": "A", "amount": 28},
        {"category": "B", "amount": 55},
        {"category": "C", "amount": 43},
        {"category": "D", "amount": 91},
        {"category": "E", "amount": 81},
        {"category": "F", "amount": 53},
        {"category": "G", "amount": 19},
        {"category": "H", "amount": 87}
      ]
    }
  ],

  "signals": [
    {
      "name": "tooltip",
      "value": {},
      "on": [
        {"events": "rect:mouseover", "update": "datum"},
        {"events": "rect:mouseout",  "update": "{}"}
      ]
    }
  ],

  "scales": [
    {
      "name": "xscale",
      "type": "band",
      "domain": {"data": "table", "field": "category"},
      "range": "width",
      "padding": 0.05,
      "round": true
    },
    {
      "name": "yscale",
      "domain": {"data": "table", "field": "amount"},
      "nice": true,
      "range": "height"
    }
  ],

  "axes": [
    { "orient": "bottom", "scale": "xscale" },
    { "orient": "left", "scale": "yscale" }
  ],

  "marks": [
    {
      "type": "rect",
      "from": {"data":"table"},
      "encode": {
        "enter": {
          "x": {"scale": "xscale", "field": "category"},
          "width": {"scale": "xscale", "band": 1},
          "y": {"scale": "yscale", "field": "amount"},
          "y2": {"scale": "yscale", "value": 0}
        },
        "update": {
          "fill": {"value": "steelblue"}
        },
        "hover": {
          "fill": {"value": "red"}
        }
      }
    },
    {
      "type": "text",
      "encode": {
        "enter": {
          "align": {"value": "center"},
          "baseline": {"value": "bottom"},
          "fill": {"value": "#333"}
        },
        "update": {
          "x": {"scale": "xscale", "signal": "tooltip.category", "band": 0.5},
          "y": {"scale": "yscale", "signal": "tooltip.amount", "offset": -2},
          "text": {"signal": "tooltip.amount"},
          "fillOpacity": [
            {"test": "datum === tooltip", "value": 0},
            {"value": 1}
          ]
        }
      }
    }
  ]
}`
    }
];

export const C4_PLANTUML_TEMPLATES = [
    {
        id: 'c4context',
        label: 'System Context',
        icon: 'fa-sitemap',
        description: 'C4 System Context Diagram',
        code: `@startuml
!include <C4/C4_Context>

Person(personAlias, "Label", "Optional Description")
System(systemAlias, "Label", "Optional Description")

Rel(personAlias, systemAlias, "Label", "Optional Technology")
@enduml`
    },
    {
        id: 'c4container',
        label: 'Container Diagram',
        icon: 'fa-layer-group',
        description: 'C4 Container Diagram',
        code: `@startuml
!include <C4/C4_Container>

Person(personAlias, "Label", "Optional Description")
System_Boundary(c1, "Label") {
    Container(containerAlias, "Label", "Technology", "Optional Description")
}

Rel(personAlias, containerAlias, "Label", "Optional Technology")
@enduml`
    },
    {
        id: 'c4component',
        label: 'Component Diagram',
        icon: 'fa-cubes',
        description: 'C4 Component Diagram',
        code: `@startuml
!include <C4/C4_Component>

Container(containerAlias, "Label", "Technology", "Optional Description")
Container_Boundary(c1, "Label") {
    Component(componentAlias, "Label", "Technology", "Optional Description")
}

Rel(containerAlias, componentAlias, "Label", "Optional Technology")
@enduml`
    }
];

export const GRAPHVIZ_TEMPLATES = [
    {
        id: 'simple',
        label: 'Simple Directed',
        icon: 'fa-project-diagram',
        description: 'Basic directed graph',
        code: `digraph G {
    A -> B;
    B -> C;
    C -> A;
}`
    },
    {
        id: 'clustered',
        label: 'Clustered',
        icon: 'fa-object-group',
        description: 'Graph with subgraphs/clusters',
        code: `digraph G {
    subgraph cluster_0 {
        style=filled;
        color=lightgrey;
        node [style=filled,color=white];
        a0 -> a1 -> a2 -> a3;
        label = "process #1";
    }

    subgraph cluster_1 {
        node [style=filled];
        b0 -> b1 -> b2 -> b3;
        label = "process #2";
        color=blue
    }
    start -> a0;
    start -> b0;
    a1 -> b3;
    b2 -> a3;
    a3 -> a0;
    a3 -> end;
    b3 -> end;

    start [shape=Mdiamond];
    end [shape=Msquare];
}`
    }
];
