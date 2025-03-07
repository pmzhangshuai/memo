import { Node } from "@/types/proto/api/v1/markdown_service";
import Renderer from "./Renderer";
import { BaseProps } from "./types";

interface Props extends BaseProps {
  children: Node[];
}

// <p></p>改为<div></div>，解决链接卡片的标题 <h3> cannot appear as a descendant of <p> 的问题
const Paragraph: React.FC<Props> = ({ children }: Props) => {
  return (
    <div>
      {children.map((child, index) => (
        <Renderer key={`${child.type}-${index}`} index={String(index)} node={child} />
      ))}
    </div>
  );
};

export default Paragraph;
