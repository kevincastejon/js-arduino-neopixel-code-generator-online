import React from 'react';
import { PhotoshopPicker } from 'react-color';
import {
  InputNumber, Button, Input, Icon, notification,
} from 'antd';
import './App.css';
import generate from 'color-gradient';

const { TextArea } = Input;

const openNotif = (type, title, message) => {
  notification[type]({
    message: title,
    description:
      message,
  });
};

const componentToHex = (c) => {
  const hex = c.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

const rgbToHex = (r, g, b) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;

const toArduinoString = (leds) => {
  let ret = `int colors[${leds.length}][4] = {`;
  for (let i = 0; i < leds.length; i += 1) {
    ret += `{${leds[i].color[0]},${leds[i].color[1]},${leds[i].color[2]},${leds[i].fadePoint !== null ? 1 : 0}},`;
  }
  ret = ret.substring(0, ret.length - 1);
  ret += '};';
  return (ret);
};

const fromArduinoString = (arduinoString) => {
  let arduiAr = arduinoString.split('=')[1].trim();
  arduiAr = arduiAr.substring(0, arduiAr.length - 1).replace(/{/g, '[').replace(/}/g, ']');
  const jsonAr = JSON.parse(arduiAr);
  const newFadePoints = [];
  jsonAr.forEach((led, i) => {
    if (led[3] === 1) {
      newFadePoints.push({ color: rgbToHex(led[0], led[1], led[2]), id: i });
    }
  });
  return (newFadePoints);
};

const getGradient = (color1, color2, segments) => {
  const col1 = color1;
  const col2 = color2;
  const colors = generate(col1, col2, segments).map((col) => col.substring(4, col.length - 1).replace(/ /g, '').split(','));
  return (colors.map((col) => col.map((c) => parseInt(c, 10))));
};

const randomHexColor = () => (rgbToHex(parseInt(Math.random() * 255, 10), parseInt(Math.random() * 255, 10), parseInt(Math.random() * 255, 10)));

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedLed: -1,
      fadePoints: [{ color: randomHexColor(), id: 0 }, { color: randomHexColor(), id: parseInt(Math.random() * 8 + 2, 10) }, { color: randomHexColor(), id: parseInt(Math.random() * 20 + 10, 10) }],
      tempColor: null,
      stripPin: 6,
    };
  }

  handleSelection=(id) => {
    const { selectedLed } = this.state;
    let val = id;
    if (selectedLed === id) {
      val = -1;
    }
    this.setState({
      selectedLed: val,
      tempColor: null,
    });
  }

  render() {
    const {
      fadePoints, selectedLed, tempColor, stripPin,
    } = this.state;
    let grads = [];
    for (let i = 1; i < fadePoints.length; i += 1) {
      const grad = getGradient(fadePoints[i - 1].color, fadePoints[i].color, (fadePoints[i].id - fadePoints[i - 1].id) - 1);
      if (i > 1) {
        grad.splice(0, 1);
      }
      grads = grads.concat(grad);
    }

    const ledsAr = grads.map((color, i) => {
      const fp = fadePoints.find((fdp) => (fdp.id === i));
      return ({
        color,
        fadePoint: fp !== undefined ? { color: fp.color } : null,
      });
    });
    const selectedLedIsFadePoint = (selectedLed > -1 && ledsAr[selectedLed].fadePoint !== null);
    const isLeftSlotFree = selectedLed > 0 && ledsAr[selectedLed - 1].fadePoint === null;
    const isRightSlotFree = selectedLed > 0 && selectedLed < ledsAr.length - 1 && ledsAr[selectedLed + 1].fadePoint === null;
    return (
      <div
        className="App"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            this.handleSelection(-1);
          }
        }}
      >
        <div
          className="header"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              this.handleSelection(-1);
            }
          }}
        >
          Arduino Neopixel code generator online
        </div>
        {selectedLed === 0 || selectedLed === fadePoints[fadePoints.length - 1].id ? <div className="control" /> : (
          <div
            className="control"
          >
            {selectedLed > -1 ? (
              <>
                {!selectedLedIsFadePoint || !isLeftSlotFree ? null : (
                  <Button
                    style={{ marginRight: 10 }}
                    title="Shift the fade point to the left"
                    onClick={(e) => {
                      const newAr = fadePoints.concat();
                      newAr.find((elt) => elt.id === selectedLed).id = selectedLed - 1;
                      this.setState({
                        fadePoints: newAr,
                        selectedLed: selectedLed - 1,
                      });
                    }}
                  >
                    <Icon type="arrow-left" />
                  </Button>
                )}
                <Button
                  type={selectedLedIsFadePoint ? 'danger' : 'primary'}
                  onClick={() => {
                    if (selectedLedIsFadePoint) {
                      let newAr = fadePoints.concat();
                      newAr = newAr.filter((c) => (c.id !== selectedLed));
                      this.setState({
                        fadePoints: newAr,
                      });
                    } else {
                      let newAr = fadePoints.concat();
                      newAr.push({ color: rgbToHex(ledsAr[selectedLed].color[0], ledsAr[selectedLed].color[1], ledsAr[selectedLed].color[2]), id: selectedLed });
                      newAr = newAr.sort((a, b) => (a.id > b.id));
                      this.setState({
                        fadePoints: newAr,
                      });
                    }
                  }}
                >
                  {selectedLedIsFadePoint ? 'Delete fade point' : 'Create fade point'}
                </Button>
                {!selectedLedIsFadePoint || !isRightSlotFree ? null : (
                  <Button
                    style={{ marginLeft: 10 }}
                    title="Shift the fade point to the right"
                    onClick={() => {
                      const newAr = fadePoints.concat();
                      newAr.find((elt) => elt.id === selectedLed).id = selectedLed + 1;
                      this.setState({
                        fadePoints: newAr,
                        selectedLed: selectedLed + 1,
                      });
                    }}
                  >
                    <Icon type="arrow-right" />
                  </Button>
                )}
              </>
            ) : (
              <label>
                {'Strip size: '}
                <InputNumber
                  style={{ width: 70 }}
                  min={2}
                  onChange={(value) => {
                    const val = parseInt(value, 10);
                    if (!Number.isNaN(val) && val >= 2) {
                      if (val < fadePoints[fadePoints.length - 1].id + 1) {
                        const dif = (fadePoints[fadePoints.length - 1].id + 1) - val;
                        let newAr = fadePoints.concat();

                        const lastElt = newAr[newAr.length - 1];
                        lastElt.id -= dif;
                        newAr = newAr.filter((elt) => (elt.id < lastElt.id || elt === lastElt));
                        this.setState({
                          fadePoints: newAr,
                        });
                      } else {
                        const dif = val - (fadePoints[fadePoints.length - 1].id + 1);
                        const newAr = fadePoints.concat();
                        newAr[newAr.length - 1].id = newAr[newAr.length - 1].id + dif;
                        this.setState({
                          fadePoints: newAr,
                        });
                      }
                    }
                  }}
                  value={fadePoints[fadePoints.length - 1].id + 1}
                />
                {' '}
leds
              </label>
            )}
          </div>
        )}
        <div
          className="ledCont"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              this.handleSelection(-1);
            }
          }}
        >
          <>
            {
            ledsAr.map((led, i) => (
              <div
                key={`led${i}`}
                role="button"
                tabIndex={0}
                onKeyPress={() => {
                  this.handleSelection(i);
                }}
                className="led"
                style={{ backgroundColor: rgbToHex(led.color[0], led.color[1], led.color[2]), border: i !== selectedLed ? null : '3px solid black' }}
                onClick={() => {
                  this.handleSelection(i);
                }}
              />
            ))
          }
            <br />
            {
            ledsAr.map((led, i) => (
              <div key={`key${i}`} className="fadePoint">
                {
                  led.fadePoint ? (
                    '▲'
                  ) : null
                }
              </div>
            ))
          }
          </>
        </div>
        {!selectedLedIsFadePoint ? (
          <div
            className="output"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                this.handleSelection(-1);
              }
            }}
          >
            <h3>Arduino output</h3>
            <label>
              {'Strip pin : '}
              <InputNumber
                value={stripPin}
                min={0}
                onChange={(value) => {
                  this.setState({ stripPin: value });
                }}
              />
            </label>
            <TextArea
              style={{ marginTop: 10 }}
              value={toArduinoString(ledsAr)}
              onChange={(e) => {
                let newAr;
                try {
                  newAr = fromArduinoString(e.target.value);
                } catch (err) {
                  openNotif('error', 'Bad format', 'The input must be a arduino declaration with same format as the output this app is generating!');
                  console.log(err);
                  return;
                }
                this.setState({
                  fadePoints: newAr,
                });
              }}
            />
            <div style={{ textAlign: 'left' }}>
              <pre>
                {`
Adafruit_NeoPixel strip = Adafruit_NeoPixel(${ledsAr.length}, ${stripPin}, NEO_GRB + NEO_KHZ800);
strip.begin();
for(uint16_t i=0; i<strip.numPixels(); i++) {
strip.setPixelColor(i, strip.Color(colors[i][0],colors[i][1],colors[i][2]));
}
strip.show();
              `}
              </pre>
            </div>
          </div>
        )
          : (
            <div className="colorPicker">
              <PhotoshopPicker
                color={rgbToHex(ledsAr[selectedLed].color[0], ledsAr[selectedLed].color[1], ledsAr[selectedLed].color[2])}
                onChange={(color) => {
                  const newAr = fadePoints.concat();
                  const led = newAr.find((elt) => elt.id === selectedLed);
                  const newTempColor = led.color;
                  led.color = color.hex;
                  this.setState({
                    fadePoints: newAr,
                    tempColor: tempColor || newTempColor,
                  });
                }}
                onAccept={() => {
                  this.setState({
                    tempColor: null,
                    selectedLed: -1,
                  });
                }}
                onCancel={() => {
                  if (tempColor === null) {
                    return;
                  }
                  const newAr = fadePoints.concat();
                  newAr.find((elt) => elt.id === selectedLed).color = tempColor;
                  this.setState({
                    fadePoints: newAr,
                    tempColor: null,
                    selectedLed: -1,
                  });
                }}
              />
            </div>
          )}
      </div>
    );
  }
}

export default App;
