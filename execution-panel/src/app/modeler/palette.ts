export function PaletteProvider(palette: any, create: any, elementFactory: any, spaceTool: any, lassoTool: any) {
    this._create = create;
    this._elementFactory = elementFactory;
    this._spaceTool = spaceTool;
    this._lassoTool = lassoTool;
    palette.registerProvider(this);
}

const DiagramList: any = {};
const diagramSubject: any = {};

PaletteProvider['$inject'] = ['palette', 'create', 'elementFactory', 'spaceTool', 'lassoTool'];

PaletteProvider.prototype.getPaletteEntries = function (element: any) {
    var self = this;

    var actions = {},
        create = this._create,
        elementFactory = this._elementFactory,
        spaceTool = this._spaceTool,
        lassoTool = this._lassoTool;


    function createAction(type: string, group: string, className: string, title: string = null, options: any = {}) {
        function createListener(event: any) {
            var shape = elementFactory.createShape(Object.assign({type: type}, options));
            if (options) {
                shape.businessObject.di.isExpanded = options.isExpanded;
            }
            create.start(event, shape);
        }

        return {
            group: group,
            className: className,
            title: title || 'Create ' + type.replace(/^bpmn\:/, ''),
            action: {
                dragstart: createListener,
                click: createListener
            }
        };
    }


  function createParticipant(event, collapsed) {
    create.start(event, elementFactory.createParticipantShape(collapsed));
  }

  Object.assign(actions, {
    'lasso-tool': {
      group: 'tools',
      className: 'bpmn-icon-lasso-tool',
      title: 'Activate the lasso tool',
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: 'Activate the create/remove space tool',
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.start-event': createAction(
      'bpmn:StartEvent', 'event', 'bpmn-icon-start-event-none'
    ),
    'create.intermediate-event': createAction(
      'bpmn:IntermediateThrowEvent', 'event', 'bpmn-icon-intermediate-event-none'
    ),
    'create.end-event': createAction(
      'bpmn:EndEvent', 'event', 'bpmn-icon-end-event-none'
    ),
    'create.exclusive-gateway': createAction(
      'bpmn:ExclusiveGateway', 'gateway', 'bpmn-icon-gateway-xor'
    ),
    'create.task': createAction(
      'bpmn:Task', 'activity', 'bpmn-icon-task'
    ),
    'create.subprocess-expanded': createAction(
      'bpmn:SubProcess', 'activity', 'bpmn-icon-subprocess-expanded', 'Create expanded SubProcess',
      { isExpanded: true }
    ),
    'create.participant-expanded': {
      group: 'collaboration',
      className: 'bpmn-icon-participant',
      title: 'Create Pool/Participant',
      action: {
        dragstart: createParticipant,
        click: createParticipant
      }
    }
  });

  return actions;
};
