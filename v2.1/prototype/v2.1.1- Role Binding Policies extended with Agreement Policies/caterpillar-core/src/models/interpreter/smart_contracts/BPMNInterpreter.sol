pragma solidity ^0.4.25;

import 'IData';
import 'IFlow';
import 'IFactory';

contract BPMNInterpreter {
    
    event MessageSent(bytes32 messageBody);
    event NewCaseCreated(address pCase);
    
    /// Instantiation of Root-Process
    function createInstance(address cFlow) public returns(address) {
        address factory = IFlow(cFlow).getFactoryInst();
        require(factory != address(0));
        
        address pCase = IFactory(factory).newInstance();
        IData(pCase).setParent(address(0), cFlow, 0);

        emit NewCaseCreated(pCase);

        executionRequired(cFlow, pCase);

    }
    
    /// Instantiation of a sub-process by its parent
    function createInstance(uint eInd, address pCase) private returns(address) {
        address pFlow = IData(pCase).getCFlowInst();
        address cFlow = IFlow(pFlow).getSubProcInst(eInd);
        
        address factory = IFlow(cFlow).getFactoryInst();
        require(factory != address(0));
        
        address cCase = IFactory(factory).newInstance();
        
        IData(cCase).setParent(pCase, cFlow, eInd);
        IData(pCase).addChild(eInd, cCase);

        executionRequired(cFlow, cCase);
        
        return cCase;
    }

    function executionRequired(address cFlow, address pCase) private {
        uint eFirst = IFlow(cFlow).getFirstElement();
        IData(pCase).setMarking(IFlow(cFlow).getPostCond(eFirst));

        uint[] memory next = IFlow(cFlow).getAdyElements(eFirst);
        
        if(next.length > 0)
            executeElements(pCase, next[0]);
    }
    
    function throwEvent(address pCase, bytes32 evCode, uint evInfo) private {
        
        /// This function only receive THROW EVENTS (throw event verification made in function executeElement)
        
        uint[2] memory pState;
        pState[0] = IData(pCase).getMarking();
        pState[1] = IData(pCase).getStartedActivities();
        
        if(evInfo & 4096 == 4096)
            /// Message (BIT 15), to publish a Message in the Ethereum Event Log
            emit MessageSent(evCode);
        if(evInfo & 5632 == 5632) {
            /// 9- End, 10- Default, 12- Message
            if(pState[0] | pState[1] == 0) // If there are not tokens to consume nor started activities in any subprocess
                tryCatchEvent(pCase, evCode, evInfo, true); // Sub-process ended, thus continue execution on parent
        } else {
            if(evInfo & 2048 == 2048)
                /// Terminate Event (BIT 11), only END EVENT from standard,
                killProcess(pCase);  // Terminate the execution in the current Sub-process and each children 
            tryCatchEvent(pCase, evCode, evInfo, pState[0] | pState[1] == 0); // Continue the execution on parent
        }
    }
    
    
    function tryCatchEvent(address pCase, bytes32 evCode, uint evInfo, bool isInstCompl) private {
        
        address catchCase = IData(pCase).getParent();
        if(catchCase == address(0)) {
            /// No Parent exist, root node
            if(evInfo & 8192 == 8192)
                /// Error event (BIT 13), only END EVENT from standard, in the root process.
                killProcess(pCase);
            return;
        }
        
        address cFlow = IData(catchCase).getCFlowInst();
        
        uint[2] memory pState;
        pState[0] = IData(catchCase).getMarking();
        pState[1] = IData(catchCase).getStartedActivities();
            
        uint subProcInd = IData(pCase).getIndexInParent();
        
        uint runInstCount = isInstCompl ? IData(catchCase).decreaseInstanceCount(subProcInd) 
                                        : IData(catchCase).getInstanceCount(subProcInd);
        
        if(runInstCount == 0)
            /// Update the corresponding sub-process, call activity as completed 
            IData(catchCase).setActivityMarking(pState[1] & ~(1 << 1 << subProcInd));
            
        uint subProcInfo = IFlow(cFlow).getTypeInfo(subProcInd);
        
        if(evInfo & 7168 != 0) {
        /// If receiving 10- Default, 11- Terminate or 12- Message
            if(runInstCount == 0 && subProcInfo & 4096 != 4096) {
            /// No Instances of the sub-process propagating the event and The sub-process isn't an event-sub-process (BIT 12)
                IData(catchCase).setMarking(pState[0] & ~IFlow(cFlow).getPostCond(subProcInd));
                executeElements(catchCase, IFlow(cFlow).getAdyElements(subProcInfo)[0]);
            } else if(subProcInfo & 128 == 128) {
            /// Multi-Instance Sequential (BIT 7), with pending instances to be started.
                createInstance(subProcInd, pCase);
            }
        } else {
        /// Signal, Error or Escalation
            
            /// Signals are only handled from the Root-Process by Broadcast, thus the propagation must reach the Root-Process.
            if(evInfo & 32768 == 32768) {
            /// Propagating the Signal to the Root-Process
                while(catchCase != address(0)) {
                    pCase = catchCase;
                    catchCase = IData(pCase).getParent();
                }
                broadcastSignal(pCase);
                return;
            }
            
            uint[] memory events = IFlow(cFlow).getEventList();
            
            /// The event can be catched only once, unless it is a signal where a broadcast must happen.
            /// Precondition: Event-subprocess must appear before boundary events on the event list.
            for(uint i = 0; i < events.length; i++) {
                
                if(IFlow(cFlow).getEventCode(events[i]) == evCode) {
                /// Verifiying there is a match with the throw-cath events.
                    
                    uint catchEvInfo = IFlow(cFlow).getTypeInfo(events[i]);  // Info of the candidate catching event
                    uint attachedTo = IFlow(cFlow).getAttachedTo(events[i]); //  
                    
                    if(catchEvInfo & 6 == 6) {
                    /// Start event-sub-process (BIT 6)
                        if(catchEvInfo & 16 == 16)
                            /// Interrupting (BIT 4 must be 1, 0 if non-interrupting)
                            killProcess(catchCase);  // Before starting the event subprocess, the parent is killed
                        
                        createInstance(attachedTo, pCase);  // Starting event sub-process
                        IData(catchCase).setActivityMarking(pState[1] | (1 << attachedTo));  // Marking the event-sub-process as started
                        return;
                    } else if(catchEvInfo & 256 == 256 && attachedTo == subProcInd) {
                    /// Boundary (BIT 6) of the subproces propagating the event
                        if(catchEvInfo & 16 == 16)
                            /// Interrupting (BIT 4 must be 1, 0 if non-interrupting)
                            killProcess(pCase);  // The subprocess propagating the event must be interrupted
                        
                        IData(catchCase).setMarking(pState[0] & ~IFlow(cFlow).getPostCond(events[i])); // Update the marking with the output of the boundary event
                        executeElements(catchCase, IFlow(cFlow).getAdyElements(events[i])[0]); // Continue the execution of possible internal elements
                        return;
                    }
                }
            }
            /// If the event was not caught the propagation continues to the parent unless it's the root process
            throwEvent(catchCase, evCode, evInfo);
        }
    }
    
    function killProcess(address pCase) private {
        uint startedActivities = IData(pCase).getStartedActivities();
        IData(pCase).setMarking(0);
        IData(pCase).setActivityMarking(0);
        
        uint[] memory children = IFlow(IData(pCase).getCFlowInst()).getSubProcList();
        
        for(uint i = 0; i < children.length; i++)
            if(startedActivities & (1 << children[i]) != 0) 
                killProcess(IData(pCase).getChildProcInst(children[i]));
    }
    
    function killProcess(address[] memory pCases) private {
        for(uint i = 0; i < pCases.length; i++)
            killProcess(pCases[i]);
    }
    
    
    function broadcastSignal(address pCase) private {
        
        address cFlow = IData(pCase).getCFlowInst();
        
        uint[] memory events = IFlow(cFlow).getEventList();
        
        uint[2] memory pState;
        pState[1] = IData(pCase).getStartedActivities();
        
        for(uint i = 0; i < events.length; i++) {
            uint evInfo = IFlow(cFlow).getTypeInfo(events[i]);
            
            if(evInfo & 32780 == 32772) { 
                /// Event Catch Signal (BITs 2, 3 [0-catch, 1-throw], 15)
                
                uint catchEvInfo = IFlow(cFlow).getTypeInfo(events[i]);  
                uint attachedTo = IFlow(cFlow).getAttachedTo(events[i]);
                    
                if(catchEvInfo & 6 == 6) {
                /// Start event-sub-process (BIT 6)
                    if(catchEvInfo & 16 == 16)
                        /// Interrupting (BIT 4 must be 1, 0 if non-interrupting)
                        killProcess(pCase);  // Before starting the event subprocess, the current process-instance is killed
                    
                    createInstance(attachedTo, pCase);  // Starting event sub-process
                    IData(pCase).setActivityMarking(1 << attachedTo);  // Marking the event-sub-process as started
                } else if(catchEvInfo & 256 == 256) {
                /// Boundary (BIT 6) of the subproces propagating the event
                    if(catchEvInfo & 16 == 16)
                        /// Interrupting (BIT 4 must be 1, 0 if non-interrupting)
                        killProcess(IData(pCase).getChildProcInst(attachedTo));  // The subprocess propagating the event must be interrupted
                    
                    IData(pCase).setMarking(IData(pCase).getMarking() & ~IFlow(cFlow).getPostCond(events[i])); // Update the marking with the output of the boundary event
                    executeElements(pCase, IFlow(cFlow).getAdyElements(events[i])[0]); // Continue the execution of possible internal elements
                } else if(evInfo & 160 == 160) { 
                /// Start (not Event Subprocess) OR Intermediate Event
                    IData(pCase).setMarking(IData(pCase).getMarking() & ~IFlow(cFlow).getPreCond(events[i]) | IFlow(cFlow).getPostCond(events[i]));
                    executeElements(pCase, IFlow(cFlow).getAdyElements(events[i])[0]);
                } 
            }
        }
        
        uint[] memory children = IFlow(IData(pCase).getCFlowInst()).getSubProcList();
        uint startedActivities = IData(pCase).getStartedActivities();
        
        for(uint j = 0; j < children.length; j++)
            if(startedActivities & (1 << children[j]) != 0)
                broadcastSignal(IData(pCase).getChildProcInst(children[j]));
    }
    
    function broadcastSignal(address[] memory pCases) private {
        for(uint i = 0; i < pCases.length; i++)
            broadcastSignal(pCases[i]);
    }
    
    
    function executeElements(address pCase, uint eInd) public {
        address cFlow = IData(pCase).getCFlowInst();
        uint[] memory next;
        
        /// Declared as an array and not as independent fields to avoid Stack Too Deep- Compilation Error
        
        /// 0- preC
        /// 1- postC
        /// 2- typeInfo
        uint[3] memory lInfo;
        
        /// 0- tokensOnEdges
        /// 1- startedActivities
        uint[2] memory pState;
        
        pState[0] = IData(pCase).getMarking();
        pState[1] = IData(pCase).getStartedActivities();
        
        /// Execution queue and pointers to the first & last element (i.e. basic circular queue implementation) 
        uint[100] memory queue;
        uint i = 0; uint count = 0; 
        
        queue[count++] = eInd;
        
        while (i < count) {
            
            eInd = queue[i++];
            
            (lInfo[0], lInfo[1], lInfo[2], next) = IFlow(cFlow).getElementInfo(eInd);
            // (preC, postC, typeInfo, next) = IFlow(cFlow).getElementInfo(eInd);
            
            /// Verifying Preconditions (i.e. Is the element enabled?)
            
            
            if(lInfo[2] & 42 == 42 ) {
                 /// else if (AND Join)
                if(pState[0] & lInfo[0] != lInfo[0])
                    continue;
                pState[0] &= ~lInfo[0];
            } else if(lInfo[2] & 74 == 74 ) {
                /// else if (OR Join)
                ///// OR Join Implementation //////
            } else if(lInfo[2] & 1 == 1 || (lInfo[2] & 4 == 4 && lInfo[2] & 640 != 0)  || lInfo[2] & 2 == 2) {
                /// If (Activity || Intermediate/End Event || Gateway != AND/OR Join)
                if(pState[0] & lInfo[0] == 0)
                    continue;
                pState[0] &= ~lInfo[0];   // Removing tokens from input arcs
            } else {
                continue;
            }
            
            /// Executing current element (If enabled)
            
            if(lInfo[2] & 65 == 65) { 
                /// (0- Activity, 6- Parallel Multi-Instance)
                uint cInst = IFlow(cFlow).getInstanceCount(eInd);
                while(cInst-- > 0)
                    createInstance(eInd, pCase);
                pState[1] |= (1 << eInd);
            } else if(lInfo[2] & 129 == 129 || (lInfo[2] & 1 == 1 && lInfo[2] & 48 != 0 && lInfo[2] & 4096 == 0)) {
                /// If (0- Activity, 7- Sequential Multi-Instance) ||
                /// Sub-process(0- Activity, 5- Sub-process) or Call-Activity(0- Activity, 4- Call-Activity) 
                /// but NOT Event Sub-process(12- Event Subprocess)
                IData(createInstance(eInd, pCase)).setInstanceCount(eInd, IFlow(cFlow).getInstanceCount(eInd));
                pState[1] |= (1 << eInd);
            } else if(lInfo[2] & 4105 == 4105 || (lInfo[2] & 10 == 2 && lInfo[2] & 80 != 0)) {
                /// (0- Activity, 3- Task, 12- Script) ||
                /// Exclusive(XOR) Split (1- Gateway, 3- Split(0), 4- Exclusive) ||
                /// Inclusive(OR) Split (1- Gateway, 3- Split(0), 6- Inclusive)
                IData(pCase).executeScript(eInd);
                pState[0] |= IData(pCase).executeScript(eInd);
            } else if ((lInfo[2] & 9 == 9 && lInfo[2] & 27657 != 0) || lInfo[2] & 2 == 2) {
                /// If (User(11), Service(13), Receive(14) or Default(10) Task || Gateways(1) not XOR/OR Split)
                /// The execution of User/Service/Receive is triggered off-chain, 
                /// Thus the starting point would be the data contract which executes any script/data-update related to the task.
                pState[0] |=  lInfo[1];
            } else if(lInfo[2] & 12 == 12) {
                /// If (2- Event, 3- Throw(1))
                IData(pCase).setMarking(pState[0]);
                IData(pCase).setActivityMarking(pState[1]);
                throwEvent(pCase, IFlow(cFlow).getEventCode(eInd), lInfo[2]);
                if(IData(pCase).getMarking() | IData(pCase).getStartedActivities() == 0)
                    /// By throwing the event, a kill was performed so the current instance was terminated
                    return;
                pState[0] = IData(pCase).getMarking();
                pState[1] = IData(pCase).getStartedActivities();
                
                if(lInfo[2] & 128 == 128) 
                    /// If Intermediate event (BIT 7)
                    pState[0] |=  lInfo[1];
            }
            
            /// Adding the possible candidates to be executed to the queue.
            /// The enablement of the element is checked at the moment it gets out of the queue.
            for(uint j = 0; j < next.length; j++) {
                queue[count] = next[j];
                count = ++count % 100;
            }
        }
        
        /// Updating the state (storage) after the execution of each internal element.
        IData(pCase).setMarking(pState[0]);
        IData(pCase).setActivityMarking(pState[1]);
        
    }
}