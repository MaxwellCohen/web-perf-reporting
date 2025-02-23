import { Label } from "@/components/ui/label";
import { ChartSelector } from "@/components/common/ChartSelector";

export function OptionsSelector<T extends string>(
    { id, onValueChange, title, options }
      : {
        id: string; onValueChange: (value: T) => void; title: string, options: (T | {
          label: string;
          value: T;
        })[];
      }) {
    return <div className=''>
      <Label className='text-center my-2 block' htmlFor={id}>
        <div>{title} </div>
      </Label>
      <ChartSelector
        id={id}
        onValueChange={onValueChange}
        options={options}
      />
    </div>;
  }