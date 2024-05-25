
def reading():
    str = input("Whats the letters")
    return str.upper()
def convert(node):
    return 4* node[1] + node[0]
wrods = set()
with open("wordhunt/WORDS.txt", "r") as file:
    for i in file.readlines():
        wrods.add(i.strip())
    file.close()
print(wrods)
def check(str):
    return str in wrods
def mapout(visited):
    pass

def recursive(str, cur = (0,0), visited= set() , path= list(), ret = ""):
    paths = path.copy()
    idk = visited.copy()
    if cur[0]<0 or cur[1]<0 or cur[1]>3 or cur[0]>3 or cur in visited:
        return path
    else:
        next = [(cur[0]+1,cur[1]+1),(cur[0]+1,cur[1]),(cur[0],cur[1]+1),(cur[0]-1,cur[1]),(cur[0],cur[1]-1),(cur[0]+1,cur[1]-1),(cur[0]-1,cur[1]+1),(cur[0]-1,cur[1]-1)]
        idk.add(cur)
        paths.append(cur)
        ret+= str[convert(cur)]




        if check(ret):
            mapout(paths)




        for i in next:
            recursive(str, i, idk, paths,  ret)
        #print(visited)


string = reading()
def invconv(num):
    x = int(num / 4)
    y = num % 4
    return (x,y)
for i in range(15):
    recursive(string, invconv(i))