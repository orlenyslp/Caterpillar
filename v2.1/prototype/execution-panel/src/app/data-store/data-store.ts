'use strict';

import { Callback } from '@ngtools/webpack/src/webpack';
import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';


@Injectable()
export class ProcessStorage {
  model = require('raw-loader!./initial.bpmn');
  resourceModel = ''
  modelId = '';

  processes = [];

  instances = {};

  actInst: string;

  roleState: string;

  constructor(private http: Http) { }

  sendResourceModel() {
    if (this.resourceModel.length < 1)
      alert('Resource File cannot be empty. Be sure to upload the required file.');
    else {
      this.http
      .post('http://localhost:3000/resources/policy', { model: this.resourceModel })
      .subscribe(
        (resp) => {
         console.log(resp.json());
      },
      (error) => {
        console.log(error);
       });
    }
  }

  createTaskRole(rootProcess, policyId) {
    if (rootProcess.length < 1)
        alert('Root proces Id cannot be empty.');
    else {
      this.http
      .post('http://localhost:3000/resources/task-role', { rootProc: rootProcess, policyId: policyId })
      .subscribe(
        (resp) => {
          console.log(resp.json());
      },
      (error) => { 
        console.log(error)
      });
    }
  }

  findRoleState(role, pCase)  {
    this.http
    .get(`http://localhost:3000/resources/${role}/${pCase}`)
    .subscribe(
    (resp) => {
      const resJ = resp.json();
      this.roleState = resp.json().state;
      alert('Role State ' + this.roleState);
    },
    (error) => { }
    );

  }

  nominate(rNominator, rNominee, nominator, nominee, pCase) {
      this.http
      .post('http://localhost:3000/resources/nominate', { rNominator: rNominator, rNominee: rNominee, nominator: nominator, nominee: nominee, pCase: pCase   })
      .subscribe(
        (resp) => {
          console.log(resp.toString());
        },
        (error) => { 
          console.log(error)
      });
  }

  release(rNominator, rNominee, nominator, pCase) {
    this.http
    .post('http://localhost:3000/resources/release', {rNominator: rNominator, rNominee: rNominee, nominator: nominator, pCase: pCase   })
    .subscribe(
      (resp) => {
        console.log(resp.toString());
      },
      (error) => { 
        console.log(error)
    });
}

vote(rNominator, rNominee, rEndorser, endorser, pCase, onNomination, isAccepted) {
  this.http
  .post('http://localhost:3000/resources/vote', {rNominator: rNominator, rNominee: rNominee, rEndorser: rEndorser, endorser: endorser, pCase: pCase, onNomination: onNomination, isAccepted: isAccepted   })
  .subscribe(
    (resp) => {
      console.log(resp.toString());
    },
    (error) => { 
      console.log(error)
  });
}

  createProcessRegistry() {
      this.http
      .post('http://localhost:3000/registry', { })
      .subscribe(
        (resp) => {
          console.log('SUCCESS: ', resp.json());
          return resp.json().address;
      },
      (error) => { 
        console.log('ERROR: ', error);
      });
  }

  loadProcessRegistry(registryAddress: string) {
    this.http
    .post('http://localhost:3000/registry/load', {from: registryAddress})
    .subscribe(
      (resp) => {
        console.log('SUCCESS: ', resp.json());
    },
    (error) => { 
      console.log('ERROR: ', error);
    });

  }


  registerModel(model: string) {
    this.http
      .post('http://localhost:3000/models', { bpmn: model })
      .subscribe(
        (resp) => {
        const res = resp.json();
        if (res.id && res.bpmn && res.solidity && this.processes.indexOf(res) < 0) {
          this.searchRegisteredModel('');
          console.log('Model ' + res.name + ' succesfully registered');
        } else {
          console.log('Error trying to register ' + this.modelId);
        }
      },
      (error) => { });
  }

  searchRegisteredModel(modelId: string) {
    this.http
      .get('http://localhost:3000/models')
      .subscribe(
      (resp) => {
        const resJ = resp.json();
        if (modelId === '') {
          this.processes = resJ;
        } else {
          this.processes = [];
          resJ.forEach(element => {
            if ((element.name.indexOf(modelId) >= 0 || element.id.indexOf(modelId) >= 0) && this.processes.indexOf(element) < 0) {
              this.processes.push(element);
            }
          });
        }
      },
      (error) => { }
      );
  }

  updateModels() {
    this.http.get('http://localhost:3000/models')
      .subscribe(resp => {
        this.processes = [];
        resp.json().forEach(element => {
          if (this.processes.indexOf(element) < 0) {
            this.processes.push(element);
          }
        });
      });
  }

  createInstance(procId: string, caseCreator: string, creatorRole: string) {
    this.http.post('http://localhost:3000/models/' + procId, {caseCreator: caseCreator, creatorRole : creatorRole})
      .subscribe(resp => {
        const res = resp.json();
        if (!this.instances[procId]) {
          this.instances[procId] = [];
        }
        this.instances[procId].push(res.address);
      });
  };

  updateInstances(procId: string) {
    this.http.get('http://localhost:3000/processes/')
      .subscribe(resp => {
        const res = resp.json();
        this.instances[procId] = [];
        res.forEach(element => {
          if (element.id === procId) {
            this.instances[procId].push(element.address);
          }
        });
        return this.instances;
      },
      (error) => {
        console.log('Error ', error)
        return []; });
      return [];
  }

  resetModel() {
    this.updateModels();
    this.model = require('raw-loader!./initial.bpmn');
    this.updateName();
  };

  updateName() {
    this.modelId = 'Process_' + this.processes.length;
    this.model = this.model.replace('id="Process"', 'id="' + this.modelId + '"');
    this.model = this.model.replace('name="Process"', 'name="' + this.modelId + '"');
  }

  hasModel(procId: string) {
    for (let i = 0; i < this.processes.length; i++) {
      if (this.processes[i].id === procId) { return true; }
    }
    return false;
  }

  get Model(): string { return this.model; }

  set Model(nModel: string) { this.model = nModel; }

  get ModelId(): string { return this.modelId; }

  set ModelId(nName: string) { this.modelId = nName; }

  get ActInst() { return this.actInst; }

  set ActInst(nActInst: string) { this.actInst = nActInst; }

  get Models(): any[] { return this.processes; }

  getInstance(name: string) { return this.instances[name] ? this.instances[name] : []; }
}
