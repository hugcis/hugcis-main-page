import pathlib
import re

pt = pathlib.Path(".")
r = re.compile(r"(\[[\w \n',.-]+?\])\((\.\.\/)?(.+?)\.md\)")

for f in pt.glob("*.md"):
    content = open(f).read()

    with open(f, "w") as outfile:
        outfile.write(r.sub(r'\1({{< relref "\3" >}})', content))
