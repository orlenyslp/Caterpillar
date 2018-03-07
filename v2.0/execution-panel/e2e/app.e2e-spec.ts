import { BpsolClientPage } from './app.po';

describe('bpsol-client App', () => {
  let page: BpsolClientPage;

  beforeEach(() => {
    page = new BpsolClientPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
