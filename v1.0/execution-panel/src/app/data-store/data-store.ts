'use strict';

import { Callback } from '@ngtools/webpack/src/webpack';
import { Injectable } from '@angular/core';
import { Http, Headers } from '@angular/http';

@Injectable()
export class ProcessStorage {
  model = require('raw-loader!./initial.bpmn');
  modelId = '';

  processes = [];

  instances = {};

  actInst: string;

  constructor(private http: Http) { }

  registerModel(model: string) {
    this.http
      .post('http://localhost:3000/models', { bpmn: model, name: this.modelId })
      .subscribe(
        (resp) => {
        const res = resp.json();
        if (res.name) {
          this.processes.push(res);
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
            if (element.name.indexOf(modelId) >= 0 || element.id.indexOf(modelId) >= 0) {
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

  createInstance(procName: string) {
    this.http.post('http://localhost:3000/models/' + procName, {})
      .subscribe(resp => {
        const res = resp.json();
        if (!this.instances[procName]) {
          this.instances[procName] = [];
        }
        this.instances[procName].push(res.address);
      });
  };

  updateInstances(procName: string) {
    this.http.get('http://localhost:3000/processes/')
      .subscribe(resp => {
        const res = resp.json();
        this.instances[procName] = [];
        res.forEach(element => {
          if (element.id === procName) {
            this.instances[element.id].push(element.address);
          }
        });
        return this.instances;
      },
      (error) => { return []; });
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
