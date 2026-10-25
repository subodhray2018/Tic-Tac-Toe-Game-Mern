
import { Segmented } from 'antd';

const OPTIONS = [
  { value: 'TwoPlayer', label: 'Two players' },
  { value: 'Computer', label: 'Play the computer' },
];

export default function ModeSwitch({ mode, disabled, onChange }) {
  return (
    <Segmented
      className="modes"
      options={OPTIONS}
      value={mode}
      disabled={disabled}
      onChange={(value) => {
        if (value !== mode) onChange(value);
      }}
    />
  );
}
